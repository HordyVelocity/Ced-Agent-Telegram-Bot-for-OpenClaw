import Anthropic from '@anthropic-ai/sdk';
import { LLM_CONFIG } from '../../config/llm-config.js';
import { SkillInjector } from '../skillInjector.js';
import { CED_BASE_PERSONA } from '../personas/ced-base.js';
// REMOVED: import { CED_FULL_PERSONA } from '../personas/ced-full.js'; ← Broken file
import { VisionCapability } from '../capabilities/vision.js';
import { AudioCapability } from '../capabilities/audio.js';
import { VideoCapability } from '../capabilities/video.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Using CED_BASE_PERSONA (stable, working version)
const ACTIVE_PERSONA = CED_BASE_PERSONA;

export async function callAnthropic(message, options = {}) {
  try {
    // Start with base persona and skill injection
    let systemPrompt = SkillInjector.inject(ACTIVE_PERSONA);
    
    // Enhance with vision if needed
    if (options.hasImage || VisionCapability.isVisionRequest(message)) {
      systemPrompt = VisionCapability.createVisionPrompt(systemPrompt, options.imageContext);
      console.log('👁️ Vision capability activated');
    }
    
    // Enhance with audio if needed
    if (options.hasAudio || AudioCapability.isAudioRequest(message)) {
      systemPrompt = AudioCapability.createAudioPrompt(systemPrompt, options.audioContext);
      console.log('🎤 Audio capability activated');
    }
    
    // Enhance with video if needed
    if (options.hasVideo || VideoCapability.isVideoRequest(message)) {
      systemPrompt = VideoCapability.createVideoPrompt(systemPrompt, options.videoContext);
      console.log('🎥 Video capability activated');
    }
    
    const response = await client.messages.create({
      model: LLM_CONFIG.anthropic.model,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: message }]
    });

    // Process response
    let fullText = "";
    for (const block of response.content || []) {
      if (block.type === "text") {
        fullText += block.text;
      } else if (block.type === "tool_use") {
        console.log(`[Claude tool_use ignored] ${block.name}`);
      }
    }
    fullText = fullText.trim();

    if (!fullText) {
      console.warn("⚠️ Claude returned no text – using fallback");
      return {
        text: "I'm having a quick think... try asking again in a second!",
        model: response.model
      };
    }

    console.log(`✅ Anthropic returned ${fullText.length} characters`);
    return { text: fullText, model: response.model };

  } catch (error) {
    console.error("❌ Anthropic error:", error.message);
    return {
      text: "Something went wrong on my side – try asking again!",
      model: "error-fallback"
    };
  }
}