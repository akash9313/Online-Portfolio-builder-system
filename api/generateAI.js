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

  // Load API Key from Vercel Secure Environment Variables (Gemini Key now)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server AI configuration error. Backend lacks Gemini API key.' })
    return
  }

  try {
    const promptText = isJson 
      ? `${prompt}\n\nReturn the response as a valid JSON object strictly formatted.` 
      : prompt;

    // Gemini API format
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }]
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      res.status(response.status).json({ error: errorData.error?.message || "Error from Gemini API." })
      return
    }

    const data = await response.json()
    
    // Extracting text from Gemini's specific JSON structure
    const text = data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text
        ? data.candidates[0].content.parts[0].text
        : "";

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
