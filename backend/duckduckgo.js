// backend/duckduckgo.js
const axios = require('axios');
const logger = require('./utils/logger');

const DDG_API = 'https://api.duckduckgo.com/';

async function search(query) {
  logger.info('DuckDuckGo: starting search', query);
  try {
    // Using DDG Instant Answer API (best-effort)
    const resp = await axios.get(DDG_API, {
      params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
      timeout: 8000
    });

    // Normalize results into sources array
    const results = [];
    // If RelatedTopics contains items with FirstURL/Result/...
    const topics = resp.data?.RelatedTopics || [];
    topics.forEach((t) => {
      if (t.FirstURL && t.Text) {
        results.push({ title: t.Text, url: t.FirstURL, snippet: t.Text });
      } else if (Array.isArray(t.Topics)) {
        t.Topics.forEach((tt) => {
          if (tt.FirstURL) results.push({ title: tt.Text || tt.Name, url: tt.FirstURL, snippet: tt.Text || '' });
        });
      }
    });

    // As fallback, add AbstractURL / AbstractText if present
    if (resp.data?.AbstractURL) {
      results.unshift({ title: resp.data.Heading || resp.data.AbstractURL, url: resp.data.AbstractURL, snippet: resp.data.AbstractText || '' });
    }

    logger.info('DuckDuckGo: found', results.length, 'items');
    return results.slice(0, 8); // limit
  } catch (err) {
    logger.error('DuckDuckGo search failed:', err.message || err);
    // Per spec: don't throw; return empty and allow model to continue from base knowledge
    return [];
  }
}

module.exports = { search };
