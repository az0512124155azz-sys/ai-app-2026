// backend/routes/download.js
const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { Buffer } = require('buffer');
const logger = require('../utils/logger');

/*
  POST /api/download
  body: { files: [{path: "file.py", content: "base64 or string", encoding: "utf8"|"base64"}], archiveName?: "project.zip" }
  returns: zip stream
*/
router.post('/', async (req, res) => {
  const { files = [], archiveName = 'download.zip' } = req.body;
  logger.info('Download request for files', files.map(f => f.path));
  try {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    const archive = archiver('zip', { zlib: { level: 9 }});
    archive.pipe(res);

    for (const f of files) {
      const content = f.encoding === 'base64' ? Buffer.from(f.content, 'base64') : Buffer.from(f.content, 'utf8');
      archive.append(content, { name: f.path });
    }

    await archive.finalize();
  } catch (err) {
    logger.error('Download error', err);
    res.status(500).json({ error: 'Failed to generate archive', detail: err.message || String(err) });
  }
});

module.exports = router;
