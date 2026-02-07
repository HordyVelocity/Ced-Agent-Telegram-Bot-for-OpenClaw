import { classifyTask } from './classify.js';
import { callAnthropic } from './providers/anthropic.js';
import { callOpenAI } from './providers/openai.js';

// ✅ Line 5 removed - the non-existent import is gone to fix MODULE_NOT_FOUND

export async function routeMessage(message, options = {}) {
    const { saveToDb = false, userId = 'test-user' } = options;
    const startTime = Date.now();
    
    console.log('\n🚀 ===== ROUTING MESSAGE =====');
    console.log(`📨 Message: ${message}`);

    try {
        const classification = classifyTask(message);
        console.log(`📋 Classified as: ${classification.type}`);
        console.log(`🎯 Provider: ${classification.provider}`);

        let response;
        if (classification.provider === 'anthropic') {
            console.log('🟣 Calling Anthropic');
            response = await callAnthropic(message);
        } else {
            console.log('🔵 Calling OpenAI');
            response = await callOpenAI(message);
        }

        // THE VITAL DATA BRIDGE
        if (!response || !response.text) {
            throw new Error('Provider returned no text');
        }

        return {
            success: true,
            text: response.text,     // Required for the Bot to "read" the message
            content: response.text,  // Backup
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