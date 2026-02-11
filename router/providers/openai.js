import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function callOpenAI(message, options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment');
  }

  try {
    const content = [];

    // Add image if present
    if (options.hasImage && options.imageData) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${options.imageMediaType || 'image/jpeg'};base64,${options.imageData}`
        }
      });
      console.log('🖼️ Image added to OpenAI request');
    }

    // Add text
    content.push({
      type: 'text',
      text: message || 'Please analyze this content'
    });

    const response = await client.chat.completions.create({
      model: options.modelOverride || "gpt-4o",
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: content
        }
      ]
    });

    const responseText = response.choices[0]?.message?.content;

    if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
      throw new Error("OpenAI returned no usable text");
    }

    console.log(`✅ OpenAI returned ${responseText.length} characters`);

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
