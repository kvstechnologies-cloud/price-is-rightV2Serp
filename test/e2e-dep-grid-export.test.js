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
  console.log('🧪 E2E Dep grid/export test starting... (ensure server is running)');

  // Simulate enhanced processing finalization by calling a lightweight export path with fake minimal structures
  // Here we directly test dep apply + verify fields presence similar to what grid/export use
  const apply = await post('/api/dep/apply', { items: [
    { itemId: '1', description: 'wood dining chair', totalReplacementPrice: 200 },
    { itemId: '2', description: 'metal lamp', totalReplacementPrice: 80 }
  ]});
  assert.strictEqual(apply.status, 200);
  const r1 = apply.json.results[0];
  assert.ok('depCat' in r1 && 'depPercent' in r1 && 'depAmount' in r1);

  console.log('✅ E2E Dep fields presence confirmed');
})().catch(err => { console.error('❌ E2E Dep test failed:', err); process.exit(1); });


