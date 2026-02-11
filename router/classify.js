import { LLM_CONFIG } from '../config/llm-config.js';

export function classifyTask(userMessage) {
  const message = userMessage.toLowerCase();

  const rules = [
    { category: 'CREATIVE',  emoji: '📝', keywords: ['write a story','creative','poem','fiction','narrative','imagine','describe','storytelling','character','plot'] },
    { category: 'ANALYTICAL', emoji: '🧠', keywords: ['analyze','evaluate','compare','assess','consider','reasoning','logic','think about','philosophical','ethical'] },
    { category: 'CODE',      emoji: '💻', keywords: ['code','function','debug','programming','javascript','python','html','css','api','algorithm','syntax'] },
    { category: 'FACTUAL',   emoji: '📚', keywords: ['what is','who is','when did','where is','define','fact','information','lookup','search'] },
    { category: 'TECHNICAL', emoji: '🔧', keywords: ['documentation','technical','specification','api reference','install','setup','configuration','deploy'] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => message.includes(kw))) {
      const cat = LLM_CONFIG.classification.categories[rule.category];
      console.log(rule.emoji + ' Classified as: ' + rule.category + ' → ' + cat.provider + '/' + cat.model);
      return { category: rule.category, provider: cat.provider, model: cat.model, confidence: 'high' };
    }
  }

  const def = LLM_CONFIG.classification.categories.CONVERSATIONAL;
  console.log('💬 Classified as: CONVERSATIONAL → ' + def.provider + '/' + def.model);
  return { category: 'CONVERSATIONAL', provider: def.provider, model: def.model, confidence: 'low' };
}

export function forceProvider(provider) {
  if (provider !== 'openai' && provider !== 'anthropic') throw new Error('Invalid provider: ' + provider);
  return { category: 'MANUAL', provider, model: null, confidence: 'manual' };
}

export default { classifyTask, forceProvider };
