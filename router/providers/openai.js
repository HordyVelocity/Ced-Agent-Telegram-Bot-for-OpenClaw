import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function callOpenAI(message, options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment');
  }

  try {
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
      console.log('📚 Added ' + messages.length + ' history messages to OpenAI');
    }

    // Build current message content
    const content = [];

    if (options.hasImage && options.imageData) {
      content.push({
        type: 'image_url',
        image_url: {
          url: 'data:' + (options.imageMediaType || 'image/jpeg') + ';base64,' + options.imageData
        }
      });
      console.log('🖼️ Image added to OpenAI request');
    }

    content.push({
      type: 'text',
      text: message || 'Please analyze this content'
    });

    messages.push({ role: 'user', content: content });

    const response = await client.chat.completions.create({
      model: options.modelOverride || "gpt-4o",
      max_tokens: 1024,
      temperature: 0.7,
      messages: messages
    });

    const responseText = response.choices[0]?.message?.content;

    if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
      throw new Error("OpenAI returned no usable text");
    }

    console.log("✅ OpenAI returned " + responseText.length + " characters");

    return {
      text: responseText,
      model: response.model || "gpt-4o"
    };

  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    if (error.status) {
      console.error('Status code:', error.status);
    }
    throw error;
  }
}
