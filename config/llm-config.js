/**
 * LLM Configuration - OpenClaw Multi-Model Routing
 */

export const LLM_CONFIG = {
  openai: { model: 'gpt-4o', maxTokens: 4096, temperature: 0.7 },
  anthropic: { model: 'claude-sonnet-4-20250514', maxTokens: 4096, temperature: 0.7 },

  classification: {
    categories: {
      CREATIVE:       { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      ANALYTICAL:     { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      CODE:           { provider: 'openai',    model: 'gpt-4o' },
      FACTUAL:        { provider: 'openai',    model: 'gpt-4o-mini' },
      CONVERSATIONAL: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      TECHNICAL:      { provider: 'openai',    model: 'gpt-4o' }
    },
    default: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
  },

  retry: { maxAttempts: 3, backoffMs: 1000 }
};

export default LLM_CONFIG;
