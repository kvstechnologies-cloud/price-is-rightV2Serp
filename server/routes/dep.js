const express = require('express');
const router = express.Router();
const DepService = require('../services/DepServiceSimple');

router.post('/apply', async (req, res) => {
  try {
    console.log('🔍 /api/dep/apply called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    console.log('📦 Items to process:', items.length);
    
    if (items.length > 0) {
      console.log('📋 First item:', JSON.stringify(items[0], null, 2));
    }
    
    const results = await DepService.applyDepreciation(items);
    console.log('✅ DepService returned results:', results.length);
    
    if (results.length > 0) {
      console.log('📋 First result:', JSON.stringify(results[0], null, 2));
    }
    
    res.json({ results });
  } catch (err) {
    console.error('❌ /api/dep/apply error:', err);
    res.status(500).json({ error: 'failed', message: err.message });
  }
});

router.post('/reload', async (req, res) => {
  try {
    const r = await DepService.reload();
    res.json(r);
  } catch (err) {
    console.error('❌ /api/dep/reload error:', err);
    res.status(500).json({ error: 'failed', message: err.message });
  }
});

module.exports = router;


