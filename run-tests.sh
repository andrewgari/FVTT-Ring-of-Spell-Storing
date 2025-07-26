#!/bin/bash

# Ring of Spell Storing - Test Runner
# Comprehensive testing script for the module

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}🧪 Ring of Spell Storing - Test Suite${NC}"
echo

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

log_info "Node.js version: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm first."
    exit 1
fi

log_info "npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install
fi

# Run linting first
log_info "Running ESLint..."
if npm run lint; then
    log_success "Linting passed"
else
    log_error "Linting failed. Please fix the issues before running tests."
    exit 1
fi

echo

# Parse command line arguments
TEST_TYPE=${1:-all}

case "$TEST_TYPE" in
    "unit")
        log_info "Running unit tests..."
        npm run test -- tests/ring-interface.test.js
        ;;
    "integration")
        log_info "Running integration tests..."
        npm run test -- tests/integration.test.js
        ;;
    "persistence")
        log_info "Running data persistence tests..."
        npm run test -- tests/data-persistence.test.js
        ;;
    "coverage")
        log_info "Running tests with coverage..."
        npm run test:coverage
        ;;
    "watch")
        log_info "Running tests in watch mode..."
        npm run test:watch
        ;;
    "all"|*)
        log_info "Running all tests..."
        npm run test:verbose
        ;;
esac

TEST_EXIT_CODE=$?

echo

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "All tests passed! 🎉"
    echo
    echo -e "${GREEN}📊 Test Summary:${NC}"
    echo "  - Unit tests: Ring interface functionality"
    echo "  - Integration tests: Multi-character workflows"
    echo "  - Persistence tests: Data storage and retrieval"
    echo
    echo -e "${BLUE}💡 Available test commands:${NC}"
    echo "  ./run-tests.sh unit        - Run unit tests only"
    echo "  ./run-tests.sh integration - Run integration tests only"
    echo "  ./run-tests.sh persistence - Run data persistence tests only"
    echo "  ./run-tests.sh coverage    - Run tests with coverage report"
    echo "  ./run-tests.sh watch       - Run tests in watch mode"
    echo "  ./run-tests.sh all         - Run all tests (default)"
else
    log_error "Some tests failed. Please check the output above."
    echo
    echo -e "${YELLOW}🔧 Debugging tips:${NC}"
    echo "  - Check the test output for specific failures"
    echo "  - Run individual test suites to isolate issues"
    echo "  - Use 'npm run test:verbose' for detailed output"
    echo "  - Check the data persistence tests for storage issues"
fi

exit $TEST_EXIT_CODE
