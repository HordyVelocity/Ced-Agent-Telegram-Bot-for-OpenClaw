import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function callOpenAI(message) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment');
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4",
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    // FIX: Extract text from OpenAI's response format
    const responseText = response.choices[0]?.message?.content;

    if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
      throw new Error("OpenAI returned no usable text");
    }

    console.log(`✅ OpenAI returned ${responseText.length} characters`);

    return {
      text: responseText,
      model: response.model || "gpt-4"
    };

  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    if (error.status) {
      console.error('Status code:', error.status);
    }
    throw error;
  }
}