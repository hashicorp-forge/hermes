#!/usr/bin/env node
/**
 * Coverage threshold checker for Hermes web tests
 * 
 * Reads the coverage-summary.json file and validates that all metrics
 * meet the configured thresholds. Used in CI to enforce coverage standards.
 * 
 * Usage:
 *   node scripts/check-coverage.js
 *   node scripts/check-coverage.js --threshold 70
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
const defaultThreshold = thresholdArg 
  ? parseInt(thresholdArg.split('=')[1]) 
  : 60;

// Coverage file paths
const coverageDir = join(__dirname, '..', 'coverage');
const summaryPath = join(coverageDir, 'coverage-summary.json');

// Check if coverage exists
if (!existsSync(summaryPath)) {
  console.error('❌ Coverage summary not found!');
  console.error(`   Expected at: ${summaryPath}`);
  console.error('   Run tests with COVERAGE=true first.');
  process.exit(1);
}

// Read coverage data
const coverageData = JSON.parse(readFileSync(summaryPath, 'utf8'));
const { total } = coverageData;

// Metrics to check
const metrics = ['lines', 'statements', 'functions', 'branches'];
const thresholds = {
  lines: process.env.COVERAGE_LINES || defaultThreshold,
  statements: process.env.COVERAGE_STATEMENTS || defaultThreshold,
  functions: process.env.COVERAGE_FUNCTIONS || defaultThreshold,
  branches: process.env.COVERAGE_BRANCHES || (defaultThreshold - 5), // Branches typically lower
};

console.log('\n📊 Coverage Report\n' + '='.repeat(60));

let failed = false;
let results = [];

metrics.forEach(metric => {
  const actual = total[metric].pct;
  const threshold = thresholds[metric];
  const passing = actual >= threshold;
  
  if (!passing) {
    failed = true;
  }
  
  const icon = passing ? '✅' : '❌';
  const status = passing ? 'PASS' : 'FAIL';
  const diff = (actual - threshold).toFixed(2);
  const diffStr = diff >= 0 ? `+${diff}` : diff;
  
  const line = `${icon} ${metric.padEnd(12)} ${actual.toFixed(2)}% (threshold: ${threshold}%, ${diffStr}%) [${status}]`;
  console.log(line);
  
  results.push({
    metric,
    actual,
    threshold,
    passing,
    diff: parseFloat(diff),
  });
});

console.log('='.repeat(60));

// Summary statistics
const coveredLines = total.lines.covered;
const totalLines = total.lines.total;
const uncoveredLines = totalLines - coveredLines;

console.log(`\n📈 Statistics:`);
console.log(`   Total Lines: ${totalLines}`);
console.log(`   Covered: ${coveredLines} (${total.lines.pct.toFixed(2)}%)`);
console.log(`   Uncovered: ${uncoveredLines} (${(100 - total.lines.pct).toFixed(2)}%)`);

if (failed) {
  console.log('\n❌ Coverage check FAILED - some metrics below threshold');
  console.log('\nTo improve coverage:');
  console.log('  1. Run: COVERAGE=true yarn test:ember');
  console.log('  2. Open: coverage/index.html');
  console.log('  3. Find untested files and add tests');
  console.log('  4. See: docs-internal/testing/EMBER_TESTING_GUIDE.md\n');
  process.exit(1);
} else {
  console.log('\n✅ All coverage metrics meet thresholds!\n');
  process.exit(0);
}
