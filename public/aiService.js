/**
 * aiService.js
 * Centralized service for Google Gemini AI integration.
 */

class AIService {
    constructor() {
        this.baseUrl = 'https://online-portfolio-builder-system.vercel.app/api/generateAI';
    }

    async callAI(prompt, isJson = false) {
        const requestBody = {
            prompt: prompt,
            isJson: isJson
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMsg = 'Failed to connect to AI backend API';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // If it fails to parse JSON error, fall back to default
            }
            console.error('Backend AI Error:', errorMsg);
            throw new Error(errorMsg);
        }

        const jsonResponse = await response.json();
        
        // The backend already handles the JSON validation and parsing for us securely
        return jsonResponse.data;
    }

    /**
     * Generates a professional bio.
     */
    async generateBio(name, role, skills, location) {
        const prompt = `Act as a professional portfolio writer. Write a compelling, professional, and concise "About Me" bio (max 400 characters) for ${name}, who is a ${role}. 
        Key skills: ${skills.join(', ')}. 
        Location: ${location}. 
        The tone should be modern, professional, and highlight expertise. Use first-person "I".
        IMPORTANT: Return ONLY the raw rewritten bio text. Do not include any conversational preamble, labels, or extra formatting.`;
        
        return await this.callAI(prompt);
    }

    /**
     * Suggests relevant skills based on role.
     */
    async suggestSkills(role, currentSkills) {
        const prompt = `Based on the role of "${role}", suggest 10 most relevant technical skills or tools that would look great on a professional portfolio. 
        Exclude these skills if they are already listed: ${currentSkills.join(', ')}.
        Return a JSON array of strings.`;
        
        return await this.callAI(prompt, true);
    }

    /**
     * Professionalizes a project description.
     */
    async improveProjectDesc(title, tech, basicDesc) {
        const prompt = `Rewrite this project description to be highly professional and impactful for a tech portfolio. 
        Project Title: ${title}
        Technologies: ${tech}
        Basic Description: ${basicDesc}
        
        Focus on results, challenges overcome, and technical implementation. Keep it under 350 characters. Use professional action verbs. Use first-person.
        IMPORTANT: Return ONLY the raw rewritten description text. Do not include any conversational preamble, job title, company name, labels, or formatting.`;
        
        return await this.callAI(prompt);
    }

    /**
     * Professionalizes a work experience description.
     */
    async improveExperienceDesc(title, company, basicDesc) {
        const prompt = `Rewrite this work experience description to be highly professional and impactful for a tech portfolio. 
        Job Title: ${title}
        Company: ${company}
        Basic Description: ${basicDesc}
        
        Focus on responsibilities, achievements, and technical impact. Keep it under 400 characters. Use professional action verbs. Use first-person.
        IMPORTANT: Return ONLY the raw rewritten description text. Do not include any conversational preamble, job title, company name, labels, or formatting.`;
        
        return await this.callAI(prompt);
    }

    /**
     * Analyzes portfolio data and returns a score and tips.
     */
    async analyzePortfolioScore(userData) {
        const prompt = `Analyze this portfolio data and provide a "Professional Readiness Score" (0-100) and 3 actionable tips to improve it.
        Data: ${JSON.stringify(userData)}
        
        Consider the depth of descriptions, the variety of skills, and whether key links (GitHub/LinkedIn) are present.
        Return a JSON object: { "score": number, "tips": [string, string, string], "feedback": string }`;
        
        return await this.callAI(prompt, true);
    }

    /**
     * Parses raw resume text into structured data.
     */
    async parseResume(rawText) {
        const prompt = `Extract structured information from the following resume text. 
        Raw Text: ${rawText}
        
        Extract: Full Name, Role/Title, Summary/Bio, Skills (array), Education (array), Projects (array).
        Format the response as a structured JSON object. Focus on high accuracy.`;
        
        return await this.callAI(prompt, true);
    }
}

export const aiService = new AIService();
