/**
 * LLM Configuration
 * Model settings for OpenAI and Anthropic providers
 * OpenClaw Multi-Model Routing
 */

export const LLM_CONFIG = {
  // OpenAI Configuration (defaults)
  openai: {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7
  },

  // Anthropic Configuration (defaults)
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7
  },

  // Task Classification Settings - now with specific models per category
  classification: {
    categories: {
      CREATIVE: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',    // Best creative writing
        description: 'Creative writing, storytelling'
      },
      ANALYTICAL: {
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',      // Deepest thinker
        description: 'Analysis, reasoning, complex thinking'
      },
      CODE: {
        provider: 'openai',
        model: 'gpt-4o',                      // Strong coder + vision
        description: 'Code generation, debugging'
      },
      FACTUAL: {
        provider: 'openai',
        model: 'gpt-4o-mini',                 // Fast + cheap for lookups
        description: 'Factual queries, quick answers'
      },
      CONVERSATIONAL: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20241022',   // Fast + cheap for chat
        description: 'General chat, dialogue'
      },
      TECHNICAL: {
        provider: 'openai',
        model: 'gpt-4o',                      // Solid on
cat > router/classify.js << 'EOF'
/**
 * Task Classification
 * Determines which LLM provider AND model to use based on task type
 */

import { LLM_CONFIG } from '../config/llm-config.js';

export function classifyTask(userMessage) {
  const message = userMessage.toLowerCase();

  const rules = [
    {
      category: 'CREATIVE',
      emoji: '📝',
      keywords: ['write a story', 'creative', 'poem', 'fiction', 'narrative',
        'imagine', 'describe', 'storytelling', 'character', 'plot']
    },
    {
      category: 'ANALYTICAL',
      emoji: '🧠',
      keywords: ['analyze', 'evaluate', 'compare', 'assess', 'consider',
        'reasoning', 'logic', 'think about', 'philosophical', 'ethical']
    },
    {
      category: 'CODE',
      emoji: '💻',
      keywords: ['code', 'function', 'debug', 'programming', 'javascript',
        'python', 'html', 'css', 'api', 'algorithm', 'syntax']
    },
    {
      category: 'FACTUAL',
      emoji: '📚',
      keywords: ['what is', 'who is', 'when did', 'where is', 'define',
        'fact', 'information', 'lookup', 'search']
    },
    {
      category: 'TECHNICAL',
      emoji: '🔧',
      keywords: ['documentation', 'technical', 'specification', 'api reference',
        'install', 'setup', 'configuration', 'deploy']
    }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => message.includes(kw))) {
      const cat = LLM_CONFIG.classification.categories[rule.category];
      console.log(`${rule.emoji} Classified as: ${rule.category} → ${cat.provider}/${cat.model}`);
      return {
        category: rule.category,
        provider: cat.provider,
        model: cat.model,
        confidence: 'high'
      };
    }
  }

  // Default to conversational
  const def = LLM_CONFIG.classification.categories.CONVERSATIONAL;
  console.log(`💬 Classified as: CONVERSATIONAL → ${def.provider}/${def.model}`);
  return {
    category: 'CONVERSATIONAL',
    provider: def.provider,
    model: def.model,
    confidence: 'low'
  };
}

export function forceProvider(provider) {
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new Error(`Invalid provider: ${provider}`);
  }
  return { category: 'MANUAL', provider, model: null, confidence: 'manual' };
}

export default { classifyTask, forceProvider };
