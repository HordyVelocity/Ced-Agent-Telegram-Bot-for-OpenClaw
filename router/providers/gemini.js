import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function callGemini(message, options = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in environment");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const parts = [];

    if (options.hasImage && options.imageData) {
      parts.push({
        inlineData: {
          mimeType: options.imageMediaType || "image/jpeg",
          data: options.imageData
        }
      });
      console.log("🖼️ Image added to Gemini request");
    }

    if (options.hasVideo && options.videoData) {
      parts.push({
        inlineData: {
          mimeType: options.videoMediaType || "video/mp4",
          data: options.videoData
        }
      });
      console.log("🎬 Video added to Gemini request");
    }

    if (options.hasAudio && options.audioData) {
      parts.push({
        inlineData: {
          mimeType: options.audioMediaType || "audio/ogg",
          data: options.audioData
        }
      });
      console.log("🎤 Audio added to Gemini request");
    }

    parts.push({ text: message || "Please analyze this content" });

    console.log("🔷 Calling Gemini 2.0 Flash with " + parts.length + " parts");

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim() === "") {
      throw new Error("Gemini returned no usable text");
    }

    console.log("✅ Gemini returned " + text.length + " characters");

    return {
      text: text,
      model: "gemini-2.0-flash"
    };

  } catch (error) {
    console.error("❌ Gemini error: " + error.message);
    if (error.status) {
      console.error("Status code: " + error.status);
    }
    throw error;
  }
}
