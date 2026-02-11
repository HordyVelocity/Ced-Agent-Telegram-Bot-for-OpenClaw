/**
 * LLM Configuration
 * Model settings for OpenAI and Anthropic providers
 */

export const LLM_CONFIG = {
  // OpenAI Configuration
  openai: {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0
  },

  // Anthropic Configuration
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1
  },

  // Task Classification Settings
  classification: {
    // Task categories that map to providers
    categories: {
      CREATIVE: 'anthropic',      // Creative writing, storytelling
      ANALYTICAL: 'anthropic',    // Analysis, reasoning, complex thinking
      CODE: 'anthropic',              // Code generation, debugging
      FACTUAL: 'anthropic',           // Factual queries, quick answers
      CONVERSATIONAL: 'anthropic', // General chat, dialogue
      TECHNICAL: 'anthropic'          // Technical documentation, APIs
    },

    // Default provider if classification is uncertain
    defaultProvider: 'anthropic'
  },

  // Retry settings
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
};

export default LLM_CONFIG;