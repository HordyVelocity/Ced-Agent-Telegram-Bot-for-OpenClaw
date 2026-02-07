import { SkillInjector } from './skillInjector.js';
import { OpenAIProvider } from './openai.js';

export class OpenClawRouter {
    constructor(config) {
        this.config = config;
        this.openai = new OpenAIProvider(process.env.OPENAI_API_KEY);
    }

    async process(message, sessionId, options = {}) {
        const systemPrompt = SkillInjector.inject(this.config.backupPersona);
        console.log(`[Router] Skills Injected. Routing to OpenAI...`);
        const responseText = await this.openai.chat(message, systemPrompt);
        return {
            pipe: (res) => res.json({ status: "Success", response: responseText }),
            text: responseText
        };
    }
}
