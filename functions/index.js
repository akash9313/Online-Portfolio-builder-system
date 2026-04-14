import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const generateAIResponse = onRequest({ cors: true }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed. Use POST." });
        }

        const { prompt, isJson } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required in the request body." });
        }

        // process.env loads automatically from .env in Firebase Functions v2
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            logger.error("OPENAI_API_KEY is not defined in the environment variables.");
            return res.status(500).json({ error: "Server AI configuration error." });
        }

        const requestBody = {
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2048
        };

        if (isJson) {
            requestBody.response_format = { type: "json_object" };
            // Ensure the word JSON is in the prompt to satisfy OpenAI's strict requirement
            requestBody.messages[0].content += "\n\nReturn the response as a valid JSON object only.";
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("OpenAI API error", errorData);
            return res.status(response.status).json({ 
                error: errorData.error?.message || "Error communicating with OpenAI API." 
            });
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        if (isJson) {
            try {
                // OpenAI guarantees JSON if type: json_object is set, 
                // but we clean any stray markdown blocks just in case.
                const cleanJson = text.replace(/```json|```/g, '').trim();
                const jsonResponse = JSON.parse(cleanJson);
                // Return structured object natively
                return res.status(200).json({ data: jsonResponse });
            } catch (err) {
                logger.error("Failed to parse AI JSON response", text);
                return res.status(500).json({ error: "AI returned invalid response format structure." });
            }
        }

        // Return standard text response string
        return res.status(200).json({ data: text.trim() });

    } catch (error) {
        logger.error("Unhandled error in generateAIResponse:", error);
        return res.status(500).json({ error: "Internal server error occurred." });
    }
});
