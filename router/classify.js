/**
 * Task Classification
 * Determines which LLM provider to use based on task type
 */

import { LLM_CONFIG } from '../config/llm-config.js';

/**
 * Classify task based on keywords and patterns
 */
export function classifyTask(userMessage) {
  const message = userMessage.toLowerCase();

  // Creative writing indicators
  const creativeKeywords = [
    'write a story', 'creative', 'poem', 'fiction', 'narrative',
    'imagine', 'describe', 'storytelling', 'character', 'plot'
  ];

  // Analytical thinking indicators
  const analyticalKeywords = [
    'analyze', 'evaluate', 'compare', 'assess', 'consider',
    'reasoning', 'logic', 'think about', 'philosophical', 'ethical'
  ];

  // Code-related indicators
  const codeKeywords = [
    'code', 'function', 'debug', 'programming', 'javascript',
    'python', 'html', 'css', 'api', 'algorithm', 'syntax'
  ];

  // Factual query indicators
  const factualKeywords = [
    'what is', 'who is', 'when did', 'where is', 'define',
    'fact', 'information', 'lookup', 'search'
  ];

  // Technical documentation indicators
  const technicalKeywords = [
    'documentation', 'technical', 'specification', 'api reference',
    'install', 'setup', 'configuration', 'deploy'
  ];

  // Check for creative writing
  if (creativeKeywords.some(keyword => message.includes(keyword))) {
    console.log('📝 Classified as: CREATIVE');
    return {
      category: 'CREATIVE',
      provider: LLM_CONFIG.classification.categories.CREATIVE,
      confidence: 'high'
    };
  }

  // Check for analytical thinking
  if (analyticalKeywords.some(keyword => message.includes(keyword))) {
    console.log('🧠 Classified as: ANALYTICAL');
    return {
      category: 'ANALYTICAL',
      provider: LLM_CONFIG.classification.categories.ANALYTICAL,
      confidence: 'high'
    };
  }

  // Check for code-related
  if (codeKeywords.some(keyword => message.includes(keyword))) {
    console.log('💻 Classified as: CODE');
    return {
      category: 'CODE',
      provider: LLM_CONFIG.classification.categories.CODE,
      confidence: 'high'
    };
  }

  // Check for factual queries
  if (factualKeywords.some(keyword => message.includes(keyword))) {
    console.log('📚 Classified as: FACTUAL');
    return {
      category: 'FACTUAL',
      provider: LLM_CONFIG.classification.categories.FACTUAL,
      confidence: 'medium'
    };
  }

  // Check for technical documentation
  if (technicalKeywords.some(keyword => message.includes(keyword))) {
    console.log('🔧 Classified as: TECHNICAL');
    return {
      category: 'TECHNICAL',
      provider: LLM_CONFIG.classification.categories.TECHNICAL,
      confidence: 'medium'
    };
  }

  // Default to conversational (Anthropic)
  console.log('💬 Classified as: CONVERSATIONAL (default)');
  return {
    category: 'CONVERSATIONAL',
    provider: LLM_CONFIG.classification.defaultProvider,
    confidence: 'low'
  };
}

/**
 * Override classification (for manual routing)
 */
export function forceProvider(provider) {
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new Error(`Invalid provider: ${provider}. Must be 'openai' or 'anthropic'`);
  }

  return {
    category: 'MANUAL',
    provider: provider,
    confidence: 'manual'
  };
}

export default {
  classifyTask,
  forceProvider
};