// backend/nimClient.js
const axios = require('axios');
const logger = require('./utils/logger');
require('dotenv').config();

const NIM_BASE = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';

// generic call - adapt as needed if NIM API differs
async function invokeModel(modelName, apiKey, payload = {}) {
  logger.info('NIM: invoking model', modelName);
  if (!apiKey) {
    const errMsg = `Missing API key for model ${modelName}`;
    logger.error(errMsg);
    const e = new Error(errMsg);
    e.code = 'MISSING_API_KEY';
    throw e;
  }

  const url = `${NIM_BASE}/models/${encodeURIComponent(modelName)}/invoke`;
  try {
    logger.info('NIM: POST', url);
    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
    logger.info('NIM: response received');
    return resp.data;
  } catch (err) {
    logger.error('NIM invocation failed:', err.message || err);
    // wrap and rethrow
    const e = new Error('NIM API call failed: ' + (err.message || String(err)));
    e.original = err;
    throw e;
  }
}

module.exports = { invokeModel };
