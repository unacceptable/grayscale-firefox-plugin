# Automated Testing Framework for Grayscale Focus Extension

## Overview

This directory contains a comprehensive automated testing framework for the Grayscale Focus Firefox Extension. The framework provides robust unit and integration tests to ensure code quality and functionality.

## Architecture

```
tests/
├── run-tests.sh              # Main test runner script
├── test-runner.js            # JavaScript test framework
├── package.json              # Test configuration
├── unit/                     # Unit tests
│   ├── wildcard.test.js      # Domain matching tests
│   ├── storage.test.js       # Storage management tests
│   ├── timer.test.js         # Pomodoro timer tests
│   └── analytics.test.js     # Analytics system tests
├── integration/              # Integration tests
│   ├── popup.test.js         # Popup interface tests
│   └── content-script.test.js # Content script tests
├── fixtures/                 # Test data and fixtures
├── results/                  # Test output and reports
└── coverage/                 # Code coverage reports
```

## Features

### 🧪 Test Framework
- **Custom JavaScript Test Runner**: Lightweight, dependency-free testing framework
- **Assertion Library**: Built-in assertions (assertEqual, assertTrue, assertFalse, etc.)
- **Test Organization**: Grouped into suites with descriptive test cases
- **Mocking System**: Mock DOM, browser APIs, and storage systems
- **Performance Testing**: Built-in performance benchmarks

### 📊 Test Categories

#### Unit Tests
- **Wildcard Domain Matching**: Pattern matching, validation, security
- **Storage Management**: Settings persistence, import/export, data integrity
- **Timer Functionality**: Pomodoro timer logic, state management, callbacks
- **Analytics System**: Usage tracking, statistics, data cleanup

#### Integration Tests
- **Popup Interface**: UI interactions, tab switching, form validation
- **Content Script**: Visual mode application, DOM manipulation, message handling

### 🚀 Test Execution

#### Quick Start
```bash
# Run all tests
./run-tests.sh

# Run with Node.js directly
node test-runner.js

# Using npm scripts
npm test
```

#### Advanced Options
```bash
# Environment validation only
./run-tests.sh --validate

# Clean test results
./run-tests.sh --clean

# Run specific test categories
./run-tests.sh --unit
./run-tests.sh --integration

# Show help
./run-tests.sh --help
```

### 📈 Reporting

#### Automated Reports
- **Test Results**: JSON and Markdown format reports
- **Pass/Fail Statistics**: Detailed breakdown by test suite
- **Performance Metrics**: Execution time and resource usage
- **Test Logs**: Individual log files for debugging

#### Report Locations
- `results/test-report.md` - Comprehensive test report
- `results/test-results.json` - Machine-readable results
- `results/*.log` - Individual test execution logs

## Test Specifications

### Unit Test Coverage

#### Wildcard Domain Matching (`wildcard.test.js`)
- ✅ Direct domain matching
- ✅ Wildcard subdomain patterns (`*.example.com`)
- ✅ Root domain inclusion in wildcards
- ✅ Security validation (prevent malicious patterns)
- ✅ Performance with large domain lists
- ✅ Edge cases and error handling

#### Storage Management (`storage.test.js`)
- ✅ Default settings initialization
- ✅ Individual setting persistence
- ✅ Whitelist management (add/remove/validate)
- ✅ Data export/import functionality
- ✅ Large dataset handling
- ✅ Concurrent access scenarios

#### Timer Functionality (`timer.test.js`)
- ✅ Pomodoro timer state management
- ✅ Custom duration configuration
- ✅ Session completion and switching
- ✅ Event callback system
- ✅ Time formatting utilities
- ✅ Progress calculation accuracy

#### Analytics System (`analytics.test.js`)
- ✅ Session recording and tracking
- ✅ Daily/weekly/monthly statistics
- ✅ Streak calculation logic
- ✅ Goal setting and achievement
- ✅ Data cleanup and retention
- ✅ Performance with historical data

### Integration Test Coverage

#### Popup Interface (`popup.test.js`)
- ✅ Tab switching functionality
- ✅ Enable/disable toggle behavior
- ✅ Visual mode selection
- ✅ Intensity slider operations
- ✅ Whitelist domain management
- ✅ Settings persistence simulation
- ✅ Complete workflow scenarios

#### Content Script (`content-script.test.js`)
- ✅ Visual mode application (all 6 modes)
- ✅ CSS injection and styling
- ✅ DOM manipulation safety
- ✅ Message handling between scripts
- ✅ Style persistence after DOM changes
- ✅ Performance with rapid mode changes

## Quality Assurance

### Test Standards
- **Deterministic**: All tests produce consistent results
- **Isolated**: Tests don't affect each other
- **Fast Execution**: Complete suite runs in under 5 minutes
- **Comprehensive Coverage**: Tests cover main functionality paths
- **Error Scenarios**: Tests include failure case handling

### Performance Benchmarks
- Individual test execution: < 100ms
- Large dataset operations: < 1000ms
- Complete suite execution: < 300s
- Memory usage: Monitored for leaks

### Mock Systems
- **DOM Environment**: Complete document/element simulation
- **Browser APIs**: Storage, messaging, and extension APIs
- **Event System**: Event listeners and dispatching
- **Network Requests**: Simulated for offline testing

## Continuous Integration

### GitHub Actions Ready
The testing framework is designed to work seamlessly with CI/CD:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests && ./run-tests.sh
```

### Pre-commit Hooks
Integrate with git hooks for automatic testing:

```bash
# .git/hooks/pre-commit
#!/bin/sh
cd tests && npm test
```

## Development Workflow

### Writing New Tests
1. Choose appropriate category (unit vs integration)
2. Follow existing test patterns and naming
3. Include edge cases and error scenarios
4. Add performance considerations for complex tests
5. Update this README with new test descriptions

### Debugging Test Failures
1. Check individual test logs in `results/` directory
2. Run specific test files with Node.js directly
3. Use `DEBUG=1` environment variable for verbose output
4. Review mock implementations for accuracy

### Adding Test Data
- Place fixtures in `fixtures/` directory
- Use JSON format for configuration data
- Include both valid and invalid test cases
- Document fixture purpose and structure

## Best Practices

### Test Organization
- Group related tests in suites
- Use descriptive test names
- Keep tests focused and atomic
- Avoid test interdependencies

### Assertion Strategy
- Use specific assertions over generic ones
- Include meaningful error messages
- Test both positive and negative cases
- Verify state changes explicitly

### Performance Testing
- Include timing assertions for critical paths
- Test with realistic data volumes
- Monitor memory usage patterns
- Benchmark against performance budgets

## Maintenance

### Regular Tasks
- Update test data for current browser versions
- Review and update performance benchmarks
- Clean up old test results and logs
- Validate test coverage remains comprehensive

### Version Updates
- Update Node.js version requirements as needed
- Refresh mock implementations for API changes
- Add tests for new extension features
- Maintain backward compatibility where possible

## Troubleshooting

### Common Issues
- **Node.js Version**: Ensure Node.js 14+ is installed
- **File Permissions**: Make sure `run-tests.sh` is executable
- **Path Issues**: Run tests from the `tests/` directory
- **Memory Limits**: Large datasets may require increased Node.js memory

### Getting Help
- Check test logs in `results/` directory for detailed error information
- Review test framework documentation in `test-runner.js`
- Examine individual test files for implementation examples
- Run `./run-tests.sh --help` for command-line options

---

**Compatibility**: Node.js 14+, Firefox 89+
**Maintenance**: Actively maintained
**Status**: Production Ready 🚀

## 🧪 Unified Test Runner

### Single Entry Point: `tests/test.sh`

All testing is now handled through a single, unified test runner with flexible options:

**Basic Usage:**
```bash
# Run all tests (default)
./tests/test.sh

# Run specific test categories
./tests/test.sh --unit                    # Unit tests only
./tests/test.sh --integration             # Integration tests only
./tests/test.sh --regression              # Regression tests only

# Combine categories
./tests/test.sh --unit --integration      # Unit + integration
./tests/test.sh --verbose --all           # All tests with verbose output
```

**Help:**
```bash
./tests/test.sh --help                    # Show all options
```

## 🔒 Regression Tests

### Whitelist Bug Regression Test (2025-09-23)

A critical bug was discovered where whitelisted sites were still getting visual effects applied despite being on the whitelist. This has been fixed and protected with regression tests:

**Run Regression Tests:**
```bash
# Run whitelist bug regression tests
./tests/test.sh --regression
```

**CI/CD Integration:**
- GitHub Actions workflow: `.github/workflows/whitelist-regression.yml`
- Runs automatically on pushes and PRs
- Prevents deployment if whitelist bug is reintroduced
