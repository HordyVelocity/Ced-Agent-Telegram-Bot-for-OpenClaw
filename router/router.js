import { classifyTask } from "./classify.js";
import { callAnthropic } from "./providers/anthropic.js";
import { callOpenAI } from "./providers/openai.js";
import { callGemini } from "./providers/gemini.js";

export async function routeMessage(message, options = {}) {
    const startTime = Date.now();

    console.log("\n🚀 ===== ROUTING MESSAGE =====");
    console.log("📨 Message: " + message);

    try {
        // MEDIA PRE-CHECK: Route images/video/audio to Gemini
        const hasMedia = options.hasImage || options.hasVideo || options.hasAudio;

        if (hasMedia) {
            const mediaType = options.hasVideo ? "VIDEO" : options.hasAudio ? "AUDIO" : "IMAGE";
            console.log("🔷 Media detected (" + mediaType + ") → routing to Gemini");

            const mediaResponse = await callGemini(message, options);

            if (mediaResponse && mediaResponse.text) {
                return {
                    success: true,
                    text: mediaResponse.text,
                    content: mediaResponse.text,
                    provider: "gemini",
                    model: mediaResponse.model,
                    classification: "MEDIA_" + mediaType,
                    responseTime: Date.now() - startTime
                };
            }
            throw new Error("Gemini returned no text");
        }

        // TEXT-ONLY: Classify and route via OpenClaw
        const classification = classifyTask(message);
        console.log("📋 Classified as: " + classification.category);
        console.log("🎯 Provider: " + classification.provider + " / Model: " + classification.model);

        options.modelOverride = classification.model;

        let response;
        if (classification.provider === "anthropic") {
            console.log("🟣 Calling Anthropic → " + classification.model);
            response = await callAnthropic(message, options);
        } else {
            console.log("🔵 Calling OpenAI → " + classification.model);
            response = await callOpenAI(message, options);
        }

        if (response && response.text) {
            return {
                success: true,
                text: response.text,
                content: response.text,
                provider: classification.provider,
                model: response.model,
                classification: classification.category,
                responseTime: Date.now() - startTime
            };
        }
        throw new Error("Provider returned no text");

    } catch (error) {
        console.error("❌ ROUTING ERROR: " + error.message);
        return { success: false, error: error.message };
    }
}
