/**
 * aiService.js
 * Centralized service for Google Gemini AI integration.
 */

class AIService {
    constructor() {
        this.apiKey = 'AIzaSyDWzC903edcmVofFtE1NKxDPPQhnsYw5Ac';
        this.model = 'gemini-2.5-flash';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    async callGemini(prompt, isJson = false) {
        if (!this.apiKey) {
            throw new Error('Missing Gemini API Key. Please add it in Settings.');
        }

        const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: isJson ? `${prompt}\n\nReturn the response as a valid JSON object only.` : prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                    responseMimeType: isJson ? "application/json" : "text/plain",
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API Error:', error);
            throw new Error(error.error?.message || 'Failed to connect to Gemini AI');
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        if (isJson) {
            try {
                // Remove potential markdown code blocks if the model included them despite the hint
                const cleanJson = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanJson);
            } catch (e) {
                console.error('Failed to parse AI JSON response:', text);
                throw new Error('AI returned an invalid response format.');
            }
        }

        return text.trim();
    }

    /**
     * Generates a professional bio.
     */
    async generateBio(name, role, skills, location) {
        const prompt = `Act as a professional portfolio writer. Write a compelling, professional, and concise "About Me" bio (max 400 characters) for ${name}, who is a ${role}. 
        Key skills: ${skills.join(', ')}. 
        Location: ${location}. 
        The tone should be modern, professional, and highlight expertise. Use first-person "I".`;
        
        return await this.callGemini(prompt);
    }

    /**
     * Suggests relevant skills based on role.
     */
    async suggestSkills(role, currentSkills) {
        const prompt = `Based on the role of "${role}", suggest 10 most relevant technical skills or tools that would look great on a professional portfolio. 
        Exclude these skills if they are already listed: ${currentSkills.join(', ')}.
        Return a JSON array of strings.`;
        
        return await this.callGemini(prompt, true);
    }

    /**
     * Professionalizes a project description.
     */
    async improveProjectDesc(title, tech, basicDesc) {
        const prompt = `Rewrite this project description to be highly professional and impactful for a tech portfolio. 
        Project Title: ${title}
        Technologies: ${tech}
        Basic Description: ${basicDesc}
        
        Focus on results, challenges overcome, and technical implementation. Keep it under 350 characters. Use professional action verbs. Use first-person.`;
        
        return await this.callGemini(prompt);
    }

    /**
     * Analyzes portfolio data and returns a score and tips.
     */
    async analyzePortfolioScore(userData) {
        const prompt = `Analyze this portfolio data and provide a "Professional Readiness Score" (0-100) and 3 actionable tips to improve it.
        Data: ${JSON.stringify(userData)}
        
        Consider the depth of descriptions, the variety of skills, and whether key links (GitHub/LinkedIn) are present.
        Return a JSON object: { "score": number, "tips": [string, string, string], "feedback": string }`;
        
        return await this.callGemini(prompt, true);
    }

    /**
     * Parses raw resume text into structured data.
     */
    async parseResume(rawText) {
        const prompt = `Extract structured information from the following resume text. 
        Raw Text: ${rawText}
        
        Extract: Full Name, Role/Title, Summary/Bio, Skills (array), Education (array), Projects (array).
        Format the response as a structured JSON object. Focus on high accuracy.`;
        
        return await this.callGemini(prompt, true);
    }
}

export const aiService = new AIService();
