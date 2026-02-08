import { classifyTask } from './classify.js';
import { callAnthropic } from './providers/anthropic.js';
import { callOpenAI } from './providers/openai.js';

export async function routeMessage(message, options = {}) {
    const { saveToDb = false, userId = 'test-user' } = options;
    const startTime = Date.now();
    
    console.log('\n🚀 ===== ROUTING MESSAGE =====');
    console.log(`📨 Message: ${message}`);
    console.log(`🎬 Options:`, options);

    try {
        const classification = classifyTask(message);
        console.log(`📋 Classified as: ${classification.type}`);
        console.log(`🎯 Provider: ${classification.provider}`);

        let response;
        if (classification.provider === 'anthropic') {
            console.log('🟣 Calling Anthropic with options');
            response = await callAnthropic(message, options);
        } else {
            console.log('🔵 Calling OpenAI with options');
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
            classification: classification.type,
            responseTime: Date.now() - startTime
        };
    } catch (error) {
        console.error('❌ ROUTING ERROR:', error.message);
        return { success: false, error: error.message };
    }
}
