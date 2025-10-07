const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

(async () => {
  try {
    // Use root sample present in this repo snapshot
    const filePath = path.join(__dirname, '..', 'test-simple.csv');
    if (!fs.existsSync(filePath)) throw new Error('CSV file not found: ' + filePath);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    // Optional fields used by the route
    form.append('tolerancePct', '10');

    const start = Date.now();
    const res = await axios.post('http://localhost:5000/api/enhanced/process-enhanced', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    const ms = Date.now() - start;

    if (!res.data || !res.data.results) throw new Error('Invalid response');
    const results = res.data.results;
    const sample = results[0] || {};
    const hasDepCat = ('Dep. Cat' in sample) || ('depCat' in sample);
    const hasDepPercent = ('depPercent' in sample);
    const hasDepAmount = ('depAmount' in sample);

    console.log('Items:', results.length, 'Time(ms):', ms);
    console.log('Dep fields present:', { hasDepCat, hasDepPercent, hasDepAmount });

    if (!hasDepCat) throw new Error('Missing Dep. Cat in CSV process results');
    console.log('✅ CSV dep check passed');
  } catch (err) {
    if (err.response) {
      console.error('❌ CSV dep check failed:', err.response.status, err.response.statusText);
      console.error('Body:', err.response.data);
    } else {
      console.error('❌ CSV dep check failed:', err.message);
    }
    process.exit(1);
  }
})();
