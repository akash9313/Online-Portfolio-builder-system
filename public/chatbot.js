/**
 * chatbot.js
 * AI Assistant for published portfolios.
 */

class PortfolioChatbot {
    constructor(userData) {
        this.userData = userData;
        this.isOpen = false;
        this.baseUrl = 'https://online-portfolio-builder-system.vercel.app/api/generateAI';
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        const widget = document.createElement('div');
        widget.id = 'ai-chatbot-widget';
        widget.innerHTML = `
            <div id="chatbot-launcher">
                <i class="fas fa-comment-dots"></i>
                <span class="launcher-text">Ask AI Assistant</span>
            </div>
            <div id="chatbot-window">
                <div class="chatbot-header">
                    <div class="header-info">
                        <div class="bot-avatar"><i class="fas fa-robot"></i></div>
                        <div>
                            <div class="bot-name">Portfolio AI</div>
                            <div class="bot-status">Online • Specializing in ${this.userData.profile?.fullName || 'this candidate'}</div>
                        </div>
                    </div>
                    <button id="chatbot-close"><i class="fas fa-times"></i></button>
                </div>
                <div id="chatbot-messages">
                    <div class="message bot">
                        Hi! I'm ${this.userData.profile?.fullName || "the candidate"}'s AI assistant. 
                        Ask me anything about their skills, projects, or background!
                    </div>
                </div>
                <div class="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="Type a question...">
                    <button id="chatbot-send"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Add CSS
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'chatbot.css';
        document.head.appendChild(style);
    }

    bindEvents() {
        const launcher = document.getElementById('chatbot-launcher');
        const window = document.getElementById('chatbot-window');
        const close = document.getElementById('chatbot-close');
        const send = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        launcher.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            window.classList.toggle('open', this.isOpen);
            if (this.isOpen) input.focus();
        });

        close.addEventListener('click', () => {
            this.isOpen = false;
            window.classList.remove('open');
        });

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;
            
            this.addMessage(text, 'user');
            input.value = '';
            
            const typing = this.addMessage('Thinking...', 'bot typing');
            
            try {
                const response = await this.askAI(text);
                typing.remove();
                this.addMessage(response, 'bot');
            } catch (err) {
                typing.remove();
                this.addMessage("Sorry, I'm having trouble connecting right now. Error: " + err.message, 'bot error');
            }
        };

        send.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    addMessage(text, type) {
        const container = document.getElementById('chatbot-messages');
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.textContent = text;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        return msg;
    }

    async askAI(question) {
        const prompt = `
            You are a helpful AI assistant representing ${this.userData.profile?.fullName || 'the candidate'} on their professional portfolio.
            Answer the recruiter's question based ONLY on the following candidate data. Be professional, enthusiastic, and concise.
            
            CANDIDATE DATA:
            Name: ${this.userData.profile?.fullName}
            Role: ${this.userData.profile?.role}
            Bio: ${this.userData.profile?.bio}
            Skills: ${JSON.stringify(this.userData.skills)}
            Projects: ${JSON.stringify(this.userData.projects)}
            Education: ${JSON.stringify(this.userData.education)}
            
            QUESTION: ${question}
            
            If the data doesn't contain the answer, politely say you don't have that specific information but highlight a related strength instead.
        `;

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                isJson: false
            })
        });

        if (!response.ok) {
             throw new Error('AI Service Backend unavailable');
        }
        
        const data = await response.json();
        return data.data;
    }
}

// Global initialization helper
window.initPortfolioChatbot = (userData) => {
    new PortfolioChatbot(userData);
};
