import { classifyTask } from './classify.js';
import { callAnthropic } from './providers/anthropic.js';
import { callOpenAI } from './providers/openai.js';

export async function routeMessage(message, options = {}) {
    const startTime = Date.now();
    
    console.log('\n🚀 ===== ROUTING MESSAGE =====');
    console.log(`📨 Message: ${message}`);

    try {
        const classification = classifyTask(message);
        console.log(`📋 Category: ${classification.category}`);
        console.log(`🎯 Provider: ${classification.provider} | Model: ${classification.model}`);

        // Pass the specific model in options
        options.modelOverride = classification.model;

        let response;
        if (classification.provider === 'anthropic') {
            console.log(`🟣 Calling Anthropic → ${classification.model}`);
            response = await callAnthropic(message, options);
        } else {
            console.log(`🔵 Calling OpenAI → ${classification.model}`);
            response = await callOpenAI(message, options);
        }

        if (!response || !response.text) {
            throw new Error('Provider returned no text');
        }

        return {
            success: true,
            text: response.text,
            content: response.text,
            provider: classification.provider,
            model: response.model,
            classification: classification.category,
            responseTime: Date.now() - startTime
        };
    } catch (error) {
        console.error('❌ ROUTING ERROR:', error.message);
        return { success: false, error: error.message };
    }
}
