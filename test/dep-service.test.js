const assert = require('assert');
require('dotenv').config();

const DepService = require('../server/services/DepService');

(async () => {
  console.log('🧪 DepService unit tests starting...');
  await DepService.reload();

  // Manual override
  {
    const r = await DepService.inferDepCategory({ depCat: 'Custom Cat', overrideDep: true });
    assert.strictEqual(r.depCat, 'Custom Cat');
    assert.strictEqual(r.match.strategy, 'manual_override');
  }

  // Default when no match and no hint
  {
    const r = await DepService.inferDepCategory({ description: 'zzzxxyy unlikely tokens' });
    assert.ok(r.depCat, 'Default category present');
    assert.strictEqual(r.match.strategy, 'default');
  }

  // ApplyDepreciation invalid price
  {
    const res = await DepService.applyDepreciation([{ itemId: '1', totalReplacementPrice: -1 }]);
    assert.strictEqual(res[0].depCat, null);
    assert.strictEqual(res[0].match.strategy, 'default');
  }

  // Rounding rule
  {
    const items = [{ itemId: 'x', description: 'generic chair', totalReplacementPrice: 123.456 }];
    const res = await DepService.applyDepreciation(items);
    assert.ok(typeof res[0].depAmount === 'number');
    assert.ok(/\d+\.\d{2}$/.test(res[0].depAmount.toFixed(2)));
  }

  console.log('✅ DepService unit tests passed');
})().catch(err => { console.error('❌ DepService unit tests failed:', err); process.exit(1); });


