#!/usr/bin/env node
/**
 * Automated Test Runner for Grayscale Focus Extension
 * Runs all automated tests and reports results
 *
 * Usage:
 *   node test-runner.js                  - Run all tests
 *   node test-runner.js --filter=name    - Run only tests containing 'name'
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor(filter = null) {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: []
    };
    this.currentSuite = null;
    this.filter = filter;
  }

  /**
   * Create a test suite
   */
  suite(name, callback) {
    // Skip suite if filter doesn't match
    if (this.filter && !name.toLowerCase().includes(this.filter.toLowerCase())) {
      return;
    }

    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0
    };

    this.currentSuite = suite;
    console.log(`\n📂 ${name}`);
    console.log('─'.repeat(50));

    callback();

    this.results.suites.push(suite);
    this.currentSuite = null;
  }

  /**
   * Alias for suite() for better compatibility
   */
  describe(name, callback) {
    return this.suite(name, callback);
  }

  /**
   * Define a test case
   */
  test(description, callback) {
    if (!this.currentSuite) {
      throw new Error('Tests must be defined within a suite');
    }

    this.results.total++;
    const test = { description, status: 'pending', error: null };

    try {
      callback();
      test.status = 'passed';
      this.results.passed++;
      this.currentSuite.passed++;
      console.log(`  ✅ ${description}`);
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
      this.currentSuite.failed++;
      console.log(`  ❌ ${description}`);
      console.log(`     ${error.message}`);
    }

    this.currentSuite.tests.push(test);
  }

  /**
   * Skip a test
   */
  skip(description, callback) {
    if (!this.currentSuite) {
      throw new Error('Tests must be defined within a suite');
    }

    const test = { description, status: 'skipped', error: null };
    this.results.total++;
    this.results.skipped++;
    this.currentSuite.skipped++;
    this.currentSuite.tests.push(test);
    console.log(`  ⏭️  ${description} (skipped)`);
  }

  /**
   * Assert equality
   */
  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert truthiness
   */
  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`${message || 'Assertion failed'}: expected truthy value, got ${value}`);
    }
  }

  /**
   * Assert falsiness
   */
  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`${message || 'Assertion failed'}: expected falsy value, got ${value}`);
    }
  }

  /**
   * Assert array contains value
   */
  assertContains(array, value, message = '') {
    if (!array.includes(value)) {
      throw new Error(`${message || 'Assertion failed'}: array does not contain ${value}`);
    }
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);

    const passRate = this.results.total > 0 ?
      ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
    console.log(`📊 Pass Rate: ${passRate}%`);

    // Suite breakdown
    console.log('\n📂 Suite Breakdown:');
    this.results.suites.forEach(suite => {
      const suiteTotal = suite.passed + suite.failed + suite.skipped;
      console.log(`  ${suite.name}: ${suite.passed}/${suiteTotal} passed`);
    });

    console.log('\n' + (this.results.failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed!'));

    return this.results.failed === 0;
  }

  /**
   * Export results to JSON
   */
  exportResults(filename = 'test-results.json') {
    const resultsPath = path.join(__dirname, filename);
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Results exported to: ${resultsPath}`);
  }
}

// Export for use in test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestRunner;
}

// If run directly, execute all tests
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const filterArg = args.find(arg => arg.startsWith('--filter='));
  const filter = filterArg ? filterArg.split('=')[1] : null;

  const runner = new TestRunner(filter);

  // Load and run all test files
  const testFiles = [
    './unit/wildcard.test.js',
    './unit/storage.test.js',
    './unit/timer.test.js',
    './unit/analytics.test.js',
    './integration/popup.test.js',
    './integration/content-script.test.js',
    './integration/whitelist-bug-regression.test.js'
  ];

  // Filter test files if filter is specified
  const filesToRun = filter ?
    testFiles.filter(file => file.toLowerCase().includes(filter.toLowerCase())) :
    testFiles;

  if (filter) {
    console.log(`\n🔍 Running tests matching filter: "${filter}"`);
    console.log(`📄 Files to run: ${filesToRun.length}/${testFiles.length}`);
  }

  filesToRun.forEach(file => {
    const testPath = path.join(__dirname, file);
    if (fs.existsSync(testPath)) {
      console.log(`\n🔄 Loading: ${file}`);
      require(testPath)(runner);
    } else {
      console.log(`\n⚠️  Test file not found: ${file}`);
    }
  });

  if (filesToRun.length === 0) {
    console.log(`\n❌ No test files matched filter: "${filter}"`);
    process.exit(1);
  }

  const success = runner.printResults();
  runner.exportResults();

  process.exit(success ? 0 : 1);
}
