const assert = require('assert');
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname: 'localhost', port: process.env.PORT || 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(chunks || '{}') }); }
        catch { resolve({ status: res.statusCode, text: chunks }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('🧪 Dep API tests starting... (ensure server is running)');

  const { status, json } = await post('/api/dep/apply', { items: [
    { itemId: '1', description: 'stainless refrigerator', totalReplacementPrice: 1000 },
    { itemId: '2', description: 'unknown thing', totalReplacementPrice: -1 }
  ]});

  assert.strictEqual(status, 200);
  assert.ok(json.results && Array.isArray(json.results));
  assert.strictEqual(json.results[1].depCat, null);
  assert.strictEqual(json.results[1].match.strategy, 'default');

  console.log('✅ Dep API tests passed');
})().catch(err => { console.error('❌ Dep API tests failed:', err); process.exit(1); });


