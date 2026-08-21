// backend/modelRouter.js
const logger = require('./utils/logger');
require('dotenv').config();

const ROUTES = {
  general: { model: 'meta/llama-3.3-70b-instruct', env: 'NIM_GENERAL_API_KEY' },
  reasoning: { model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', env: 'NIM_REASONING_API_KEY' },
  vision: { model: 'meta/llama-3.2-90b-vision-instruct', env: 'NIM_VISION_API_KEY' },
  fast: { model: 'nvidia/nemotron-3-nano-30b-a3b', env: 'NIM_FAST_API_KEY' },
  translate: { model: 'nvidia/riva-translate-4b-instruct-v2', env: 'NIM_TRANSLATE_API_KEY' }
};

function chooseModel(mode) {
  logger.info('ModelRouter: choosing model for mode', mode);
  switch ((mode || '').toLowerCase()) {
    case 'math':
    case 'code':
    case 'reasoning':
      return ROUTES.reasoning;
    case 'vision':
      return ROUTES.vision;
    case 'fast':
    case 'study':
    case 'studyassist':
      return ROUTES.fast;
    case 'translate':
      return ROUTES.translate;
    case 'web':
    case 'research':
    default:
      return ROUTES.general;
  }
}

function getApiKeyFor(route) {
  const key = process.env[route.env];
  return key || null;
}

module.exports = { chooseModel, getApiKeyFor };
