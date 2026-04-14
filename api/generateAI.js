export default async function handler(req, res) {
  // CORS Configuration - Safely allow your Firebase frontend to call this Vercel function
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*') 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Ensure only POST requests are processed
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

  const { prompt, isJson } = req.body

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required in the request body.' })
    return
  }

  // Load API Key from Vercel Secure Environment Variables
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server AI configuration error. Backend lacks API key.' })
    return
  }

  try {
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    }

    if (isJson) {
      requestBody.response_format = { type: "json_object" }
      requestBody.messages[0].content += "\n\nReturn the response as a valid JSON object only."
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      res.status(response.status).json({ error: errorData.error?.message || "Error from OpenAI API." })
      return
    }

    const data = await response.json()
    const text = data.choices[0].message.content

    if (isJson) {
      try {
        const cleanJson = text.replace(/```json|```/g, '').trim()
        res.status(200).json({ data: JSON.parse(cleanJson) })
      } catch (err) {
        res.status(500).json({ error: "AI returned invalid JSON response format structure." })
      }
      return
    }

    // Standard text
    res.status(200).json({ data: text.trim() })

  } catch (error) {
    console.error("Vercel Function Error:", error)
    res.status(500).json({ error: "Internal server error occurred while contacting AI." })
  }
}
