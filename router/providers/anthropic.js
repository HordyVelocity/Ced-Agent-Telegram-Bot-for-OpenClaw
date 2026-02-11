import Anthropic from '@anthropic-ai/sdk';
import { LLM_CONFIG } from '../../config/llm-config.js';
import { SkillInjector } from '../skillInjector.js';
import { CED_BASE_PERSONA } from '../personas/ced-base.js';
import { VisionCapability } from '../capabilities/vision.js';
import { AudioCapability } from '../capabilities/audio.js';
import { VideoCapability } from '../capabilities/video.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const ACTIVE_PERSONA = CED_BASE_PERSONA;

export async function callAnthropic(message, options = {}) {
  try {
    let systemPrompt = SkillInjector.inject(ACTIVE_PERSONA);

    if (options.hasImage || VisionCapability.isVisionRequest(message)) {
      systemPrompt = VisionCapability.createVisionPrompt(systemPrompt, options.imageContext);
      console.log('👁️ Vision capability activated');
    }

    if (options.hasAudio || AudioCapability.isAudioRequest(message)) {
      systemPrompt = AudioCapability.createAudioPrompt(systemPrompt, options.audioContext);
      console.log('🎤 Audio capability activated');
    }

    if (options.hasVideo || VideoCapability.isVideoRequest(message)) {
      systemPrompt = VideoCapability.createVideoPrompt(systemPrompt, options.videoContext);
      console.log('🎥 Video capability activated');
    }

    // Build messages array with conversation history
    const messages = [];

    if (options.history && options.history.length > 0) {
      for (const msg of options.history) {
        const content = msg.mediaSummary
          ? msg.mediaSummary + '\n' + msg.text
          : msg.text;
        if (content && content.trim()) {
          messages.push({ role: msg.role, content: content });
        }
      }
      console.log('📚 Added ' + messages.length + ' history messages to Anthropic');
    }

    // Build current message content
    const messageContent = [];

    if (options.hasImage && options.imageData) {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: options.imageMediaType || 'image/jpeg',
          data: options.imageData
        }
      });
      console.log('🖼️ Image added to API request');
    }

    messageContent.push({
      type: 'text',
      text: message || 'Please analyze this content'
    });

    messages.push({ role: "user", content: messageContent });

    const response = await client.messages.create({
      model: options.modelOverride || LLM_CONFIG.anthropic.model,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });

    let fullText = "";
    for (const block of response.content || []) {
      if (block.type === "text") {
        fullText += block.text;
      }
    }
    fullText = fullText.trim();

    if (!fullText) {
      console.warn("⚠️ Claude returned no text - using fallback");
      return {
        text: "I'm having a quick think... try asking again in a second!",
        model: response.model
      };
    }

    console.log("✅ Anthropic returned " + fullText.length + " characters");
    return { text: fullText, model: response.model };
  } catch (error) {
    console.error("❌ Anthropic error:", error.message);
    return {
      text: "Something went wrong on my side - try asking again!",
      model: "error-fallback"
    };
  }
}
