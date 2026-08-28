/* ============================================================
   Runs all *.test.js files in this directory with plain Node.js
   (no external test framework / dependencies required).
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const testFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js'));

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

let failed = 0;
for (const file of testFiles) {
  const fullPath = path.join(__dirname, file);
  console.log(`\n--- ${file} ---`);
  try {
    execFileSync(process.execPath, [fullPath], { stdio: 'inherit' });
  } catch (err) {
    failed++;
    console.error(`FAILED: ${file}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${testFiles.length} test file(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${testFiles.length} test file(s) passed.`);
