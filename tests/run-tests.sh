#!/bin/bash

# Automated Test Suite Runner for Grayscale Focus Extension
# This script runs all automated tests and generates reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$TEST_DIR")"
RESULTS_DIR="$TEST_DIR/results"
COVERAGE_DIR="$TEST_DIR/coverage"

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run a specific test category
run_test_category() {
    local category=$1
    local description=$2

    print_status $BLUE "🧪 Running $description..."

    if [ -f "$TEST_DIR/$category" ]; then
        # Run the test and capture output
        if "$TEST_DIR/$category" > "$RESULTS_DIR/$category.log" 2>&1; then
            print_status $GREEN "✅ $description passed"
            return 0
        else
            print_status $RED "❌ $description failed"
            echo "Last 10 lines of output:"
            tail -n 10 "$RESULTS_DIR/$category.log"
            return 1
        fi
    else
        print_status $YELLOW "⏭️  $description skipped (test not found)"
        return 0
    fi
}

# Function to run Node.js based tests
run_node_tests() {
    local test_file=$1
    local description=$2

    print_status $BLUE "🧪 Running $description..."

    if [ -f "$test_file" ]; then
        if node "$test_file" > "$RESULTS_DIR/$(basename "$test_file" .js).log" 2>&1; then
            print_status $GREEN "✅ $description passed"
            return 0
        else
            print_status $RED "❌ $description failed"
            echo "Last 10 lines of output:"
            tail -n 10 "$RESULTS_DIR/$(basename "$test_file" .js).log"
            return 1
        fi
    else
        print_status $YELLOW "⏭️  $description skipped (test not found)"
        return 0
    fi
}

# Function to validate test environment
validate_environment() {
    print_status $BLUE "🔍 Validating test environment..."

    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js not found. Please install Node.js to run tests."
        exit 1
    fi

    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 14 ]; then
        print_status $YELLOW "⚠️  Node.js version is less than 14. Some tests may not work correctly."
    fi

    # Check for required test files
    local required_files=(
        "$TEST_DIR/test-runner.js"
        "$TEST_DIR/unit/wildcard.test.js"
        "$TEST_DIR/unit/storage.test.js"
        "$TEST_DIR/unit/timer.test.js"
        "$TEST_DIR/unit/analytics.test.js"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_status $RED "❌ Required test file not found: $file"
            exit 1
        fi
    done

    print_status $GREEN "✅ Test environment validated"
}

# Function to check code style (basic linting)
check_code_style() {
    print_status $BLUE "🎨 Checking code style..."

    local style_issues=0

    # Check for basic JavaScript syntax issues in source files
    find "$ROOT_DIR/src" -name "*.js" -type f | while read -r file; do
        if ! node -c "$file" 2>/dev/null; then
            print_status $RED "❌ Syntax error in: $file"
            style_issues=$((style_issues + 1))
        fi
    done

    # Check for basic issues in test files
    find "$TEST_DIR" -name "*.js" -type f | while read -r file; do
        if ! node -c "$file" 2>/dev/null; then
            print_status $RED "❌ Syntax error in test: $file"
            style_issues=$((style_issues + 1))
        fi
    done

    if [ $style_issues -eq 0 ]; then
        print_status $GREEN "✅ Code style check passed"
        return 0
    else
        print_status $RED "❌ Code style check failed with $style_issues issues"
        return 1
    fi
}

# Function to parse test results from JSON
parse_test_results() {
    local results_file="$TEST_DIR/test-results.json"

    if [ ! -f "$results_file" ]; then
        echo "0 0 0 0"
        return
    fi

    # Use node to parse the JSON and extract test counts
    local parsed_results
    parsed_results=$(node -e "
        try {
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('$results_file', 'utf8'));
            console.log([data.total, data.passed, data.failed, data.skipped].join(' '));
        } catch (e) {
            console.log('0 0 0 0');
            console.error('Error parsing results:', e.message);
        }
    ")

    echo "$parsed_results"
}

# Function to generate test report
generate_report() {
    local suite_total=$1
    local suite_passed=$2
    local suite_failed=$3
    local suite_skipped=$4
    local overall_total=$5
    local overall_passed=$6
    local overall_failed=$7

    local report_file="$RESULTS_DIR/test-report.md"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    local pass_rate=0
    if [ "$overall_total" -gt 0 ]; then
        pass_rate=$(( overall_passed * 100 / overall_total ))
    fi

    cat > "$report_file" << EOF
# Grayscale Focus Extension - Test Report

**Generated:** $timestamp
**Overall Total Tests:** $overall_total
**Overall Passed:** $overall_passed
**Overall Failed:** $overall_failed
**Overall Pass Rate:** ${pass_rate}%

## Detailed Test Suite Results

**JavaScript Test Suite:** $suite_total tests
- ✅ Passed: $suite_passed
- ❌ Failed: $suite_failed
- ⏭️ Skipped: $suite_skipped

### Test Categories
EOF

    # Parse detailed breakdown from test results if available
    if [ -f "$TEST_DIR/test-results.json" ]; then
        node -e "
            try {
                const fs = require('fs');
                const data = JSON.parse(fs.readFileSync('$TEST_DIR/test-results.json', 'utf8'));
                if (data.suites) {
                    console.log('');
                    data.suites.forEach(suite => {
                        const passed = suite.passed || 0;
                        const total = suite.tests ? suite.tests.length : 0;
                        const status = passed === total ? '✅' : '❌';
                        console.log(\`- \${status} \${suite.name}: \${passed}/\${total} tests\`);
                    });
                }
            } catch (e) {
                console.log('- ℹ️ Detailed breakdown not available');
            }
        " >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Additional Checks

- Code Style Validation
- Environment Compatibility

## Test Logs

Individual test logs can be found in the \`tests/results/\` directory:
EOF

    # Add log file references
    for log_file in "$RESULTS_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            local basename
            basename=$(basename "$log_file")
            echo "- [\`$basename\`](./results/$basename)" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

## Environment

- **Node.js Version:** $(node --version)
- **Platform:** $(uname -s)
- **Test Runner:** Custom JavaScript Framework

## Notes

All tests are designed to be deterministic and should pass consistently.
If tests fail intermittently, check for:
- System resource constraints
- Network connectivity issues (if applicable)
- File permission problems

EOF

    print_status $BLUE "📄 Test report generated: $report_file"
}

# Function to clean up old test results
cleanup_old_results() {
    if [ -d "$RESULTS_DIR" ]; then
        rm -f "$RESULTS_DIR"/*.log
        rm -f "$RESULTS_DIR"/*.json
        rm -f "$RESULTS_DIR"/*.md
    fi

    if [ -d "$COVERAGE_DIR" ] && [ -n "${COVERAGE_DIR:?}" ]; then
        rm -rf "${COVERAGE_DIR:?}"/*
    fi
}

# Main test execution function
main() {
    local start_time
    start_time=$(date +%s)

    # Overall test counters
    local overall_total=0
    local overall_passed=0
    local overall_failed=0

    # Suite-specific counters
    local suite_total=0
    local suite_passed=0
    local suite_failed=0
    local suite_skipped=0

    print_status $BLUE "🚀 Starting Grayscale Focus Extension Test Suite"
    print_status $BLUE "=================================================="

    # Clean up old results
    cleanup_old_results

    # Validate environment
    validate_environment

    # Check code style
    print_status $BLUE "\n🎨 Checking code style..."
    if check_code_style; then
        overall_passed=$((overall_passed + 1))
        print_status $GREEN "✅ Code style check passed"
    else
        overall_failed=$((overall_failed + 1))
        print_status $RED "❌ Code style check failed"
    fi
    overall_total=$((overall_total + 1))

    # Run main test suite (all tests via test-runner.js)
    print_status $BLUE "\n🧪 Running JavaScript Test Suite..."
    if node "$TEST_DIR/test-runner.js" > "$RESULTS_DIR/complete-suite.log" 2>&1; then
        # Parse detailed test results from JSON
        local parsed_results
        parsed_results=$(parse_test_results)
        read -r suite_total suite_passed suite_failed suite_skipped <<< "$parsed_results"

        if [ "$suite_total" -gt 0 ]; then
            print_status $GREEN "✅ JavaScript test suite completed: $suite_passed/$suite_total tests passed"
            overall_total=$((overall_total + suite_total))
            overall_passed=$((overall_passed + suite_passed))
            overall_failed=$((overall_failed + suite_failed))
        else
            print_status $GREEN "✅ JavaScript test suite passed (unable to parse detailed results)"
            overall_total=$((overall_total + 1))
            overall_passed=$((overall_passed + 1))
        fi
    else
        print_status $RED "❌ JavaScript test suite failed"
        overall_total=$((overall_total + 1))
        overall_failed=$((overall_failed + 1))
        echo "Last 20 lines of output:"
        tail -n 20 "$RESULTS_DIR/complete-suite.log"
    fi

    # Run legacy wildcard test for comparison (optional)
    if [ -f "$ROOT_DIR/test-wildcard.js" ]; then
        print_status $BLUE "\n🔍 Running legacy wildcard comparison test..."
        if run_node_tests "$ROOT_DIR/test-wildcard.js" "Legacy Wildcard Tests"; then
            overall_passed=$((overall_passed + 1))
        else
            overall_failed=$((overall_failed + 1))
        fi
        overall_total=$((overall_total + 1))
    fi

    # Calculate execution time
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Generate comprehensive report
    generate_report $suite_total $suite_passed $suite_failed $suite_skipped $overall_total $overall_passed $overall_failed

    # Print final summary
    print_status $BLUE "\n=================================================="
    print_status $BLUE "🏁 Test Suite Complete"
    print_status $BLUE "=================================================="

    # Show both JavaScript suite details and overall results
    if [ "$suite_total" -gt 0 ]; then
        echo -e "🧪 ${BLUE}JavaScript Test Suite:${NC} ${suite_passed}/${suite_total} tests passed"

        # Show suite breakdown if available
        if [ -f "$TEST_DIR/test-results.json" ]; then
            node -e "
                try {
                    const fs = require('fs');
                    const data = JSON.parse(fs.readFileSync('$TEST_DIR/test-results.json', 'utf8'));
                    if (data.suites) {
                        console.log('📂 Suite Breakdown:');
                        data.suites.forEach(suite => {
                            const passed = suite.passed || 0;
                            const total = suite.tests ? suite.tests.length : 0;
                            const status = passed === total ? '✅' : '❌';
                            console.log(\`  \${status} \${suite.name}: \${passed}/\${total} tests\`);
                        });
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            "
        fi
    fi

    echo ""
    echo -e "📊 ${BLUE}Overall Results:${NC}"
    echo -e "   ${BLUE}Total Tests:${NC} $overall_total"
    echo -e "   ✅ ${GREEN}Passed:${NC} $overall_passed"
    echo -e "   ❌ ${RED}Failed:${NC} $overall_failed"
    echo -e "   📈 ${BLUE}Pass Rate:${NC} $(( overall_total > 0 ? overall_passed * 100 / overall_total : 0 ))%"
    echo -e "   ⏱️  ${BLUE}Duration:${NC} ${duration}s"

    if [ $overall_failed -eq 0 ]; then
        print_status $GREEN "\n🎉 All tests passed!"
        echo ""
        echo "Next steps:"
        echo "1. Review test report: $RESULTS_DIR/test-report.md"
        echo "2. Check individual test logs in: $RESULTS_DIR/"
        echo "3. Run manual/exploratory tests if needed"
        return 0
    else
        print_status $RED "\n⚠️  Some tests failed!"
        echo ""
        echo "To investigate failures:"
        echo "1. Check test logs in: $RESULTS_DIR/"
        echo "2. Review failed test output above"
        echo "3. Run individual tests for debugging"
        return 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Grayscale Focus Extension - Automated Test Runner"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --clean        Clean test results and exit"
        echo "  --validate     Only validate environment"
        echo "  --unit         Run only unit tests"
        echo "  --integration  Run only integration tests"
        echo ""
        exit 0
        ;;
    --clean)
        print_status $BLUE "🧹 Cleaning test results..."
        cleanup_old_results
        print_status $GREEN "✅ Cleanup complete"
        exit 0
        ;;
    --validate)
        validate_environment
        exit 0
        ;;
    --unit)
        validate_environment
        node "$TEST_DIR/test-runner.js" | grep -E "(Unit Tests|✅|❌|📊)"
        exit $?
        ;;
    --integration)
        validate_environment
        node "$TEST_DIR/test-runner.js" | grep -E "(Integration|✅|❌|📊)"
        exit $?
        ;;
    "")
        # Run all tests
        main
        exit $?
        ;;
    *)
        print_status $RED "❌ Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
