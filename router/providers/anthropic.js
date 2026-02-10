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
    
    if (options.hasDocument && options.documentData) {
      messageContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: options.documentMediaType || 'application/pdf',
          data: options.documentData
        }
      });
      console.log('📄 Document added to API request');
    }
    
    if (options.hasVideo && options.videoData) {
      messageContent.push({
        type: 'video',
        source: {
          type: 'base64',
          media_type: options.videoMediaType || 'video/mp4',
          data: options.videoData
        }
      });
      console.log('🎬 Video added to API request');
    }
    
    if (options.hasAudio && options.audioData) {
      messageContent.push({
        type: 'audio',
        source: {
          type: 'base64',
          media_type: options.audioMediaType || 'audio/ogg',
          data: options.audioData
        }
      });
      console.log('🎤 Audio added to API request');
    }
    
    messageContent.push({
      type: 'text',
      text: message || 'Please analyze this content'
    });
    
    const response = await client.messages.create({
      model: LLM_CONFIG.anthropic.model,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }]
    });

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
