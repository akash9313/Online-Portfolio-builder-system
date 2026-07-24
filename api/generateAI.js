// In-memory rate limiting map for Vercel serverless instance execution
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, userRecord);
    return false;
  }

  userRecord.count += 1;
  rateLimitMap.set(ip, userRecord);

  return userRecord.count > MAX_REQUESTS_PER_WINDOW;
}

// Clean up stale rate limit entries periodically
if (rateLimitMap.size > 1000) {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(ip);
  }
}

export default async function handler(req, res) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const origin = req.headers.origin || req.headers.referer || '';

  // Allowed Origins list - customize or match domain patterns
  const isAllowedOrigin = !origin || 
    origin.includes('portfoliox-2e787') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    origin.includes('vercel.app') ||
    origin.includes('firebaseapp.com');

  const allowedOriginHeader = isAllowedOrigin && req.headers.origin ? req.headers.origin : '';

  // Security Headers
  if (allowedOriginHeader) {
    res.setHeader('Access-Control-Allow-Origin', allowedOriginHeader);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ensure only POST requests are processed
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // Apply Rate Limiting
  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: 'Too many AI requests. Please wait a minute before trying again.' });
    return;
  }

  const { prompt, isJson } = req.body || {};

  // Input Validation & Length Cap
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'A valid text prompt is required.' });
    return;
  }

  if (prompt.length > 4000) {
    res.status(400).json({ error: 'Prompt exceeds maximum length of 4000 characters.' });
    return;
  }

  // Load API Key from Vercel Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Server Configuration Error: GEMINI_API_KEY environment variable missing.');
    res.status(500).json({ error: 'AI service is temporarily unavailable due to server configuration.' });
    return;
  }

  try {
    const promptText = isJson 
      ? `${prompt.trim()}\n\nReturn the response as a valid JSON object strictly formatted.` 
      : prompt.trim();

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`Gemini API error response status: ${response.status}`);
      res.status(502).json({ error: "Failed to generate AI response. Please try again later." });
      return;
    }

    const data = await response.json();
    
    const text = data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text
      ? data.candidates[0].content.parts[0].text
      : "";

    if (isJson) {
      try {
        const cleanJson = text.replace(/```json|```/g, '').trim();
        res.status(200).json({ data: JSON.parse(cleanJson) });
      } catch (err) {
        res.status(500).json({ error: "AI response failed JSON formatting check." });
      }
      return;
    }

    res.status(200).json({ data: text.trim() });

  } catch (error) {
    console.error("Vercel Function Execution Error:", error);
    res.status(500).json({ error: "An error occurred while communicating with the AI service." });
  }
}

