#!/usr/bin/env node
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

function normalizeName(name) {
  return (name || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toDecimalRate(val) {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).toString().replace(/%/g, '').trim());
  if (isNaN(num)) return 0;
  return Math.round((num / 100) * 10000) / 10000; // 4 dp
}

async function main() {
  const excelPath = process.env.DEP_CATS_XLSX_PATH || path.join(__dirname, '..', 'New folder', 'Non Xact Category Sheet.xlsx');
  console.log(`📄 Loading Excel: ${excelPath}`);
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel not found at ${excelPath}`);
    process.exit(1);
  }

  const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing DB env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'price_is_right_admin',
    multipleStatements: true
  });

  // Ensure table exists (idempotent)
  await connection.execute(
    'CREATE TABLE IF NOT EXISTS dep_categories (\n      id INT AUTO_INCREMENT PRIMARY KEY,\n      code VARCHAR(8),\n      name VARCHAR(128) UNIQUE NOT NULL,\n      annual_depreciation_rate DECIMAL(6,4) NOT NULL,\n      useful_life VARCHAR(16),\n      examples_text TEXT\n    )'
  );

  const workbook = xlsx.readFile(excelPath);
  const sheetName = process.env.DEP_CATS_SHEET || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`❌ Sheet not found: ${sheetName}`);
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`📊 Rows parsed: ${rows.length}`);

  let inserted = 0, updated = 0, skipped = 0;

  const normKey = k => (k || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
  const pick = (row, candidates, fallbackPredicate) => {
    const keys = Object.keys(row);
    // direct candidates
    for (const key of keys) {
      const nk = normKey(key);
      if (candidates.some(c => nk === normKey(c))) return row[key];
    }
    // fuzzy by predicate
    if (fallbackPredicate) {
      for (const key of keys) {
        if (fallbackPredicate(normKey(key))) return row[key];
      }
    }
    return '';
  };

  for (const row of rows) {
    const nameRaw = pick(row, ['Category', 'Dep. Category', 'Category Name'], nk => nk === 'category' || nk.startsWith('category'));
    const rateRaw = pick(row, ['Annual Depreciation (%)', 'Annual Depreciation %', 'Annual Depreciation'], nk => nk.includes('annual') && nk.includes('depreci'));
    const life = pick(row, ['Useful Life', 'useful_life'], nk => nk.includes('useful') && nk.includes('life'));
    const examples = pick(row, ['Category Examples', 'Examples'], nk => nk.includes('example'));

    const name = (nameRaw || '').toString().trim();
    const nameNorm = normalizeName(name);
    const depRate = toDecimalRate(rateRaw);

    if (!nameNorm) { skipped++; continue; }

    // Try update by normalized name; if not found, insert
    const [existing] = await connection.execute(
      'SELECT id, name FROM dep_categories WHERE LOWER(TRIM(REPLACE(name, "  ", " "))) = ? LIMIT 1',
      [nameNorm]
    );

    if (existing.length) {
      await connection.execute(
        'UPDATE dep_categories SET annual_depreciation_rate = ?, useful_life = ?, examples_text = ? WHERE id = ?',
        [depRate, String(life || ''), String(examples || ''), existing[0].id]
      );
      updated++;
    } else {
      await connection.execute(
        'INSERT INTO dep_categories (code, name, annual_depreciation_rate, useful_life, examples_text) VALUES (?, ?, ?, ?, ?)',
        [null, name, depRate, String(life || ''), String(examples || '')]
      );
      inserted++;
    }
  }

  console.log(`✅ Seed complete. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  await connection.end();
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});


