#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - E2E Test Runner
# ============================================================================
# This script runs comprehensive E2E tests for the UR10 Robot Kiosk system
# with various configurations and reporting options.
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
TEST_SUITE="all"
BROWSER="chromium"
HEADED=false
DEBUG=false
PARALLEL=true
RETRY_COUNT=1
TIMEOUT=60000
BASE_URL="https://localhost:5173"
ROBOT_SERVER_URL="https://localhost:8000"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
UR10 Robot Kiosk E2E Test Runner

Usage: $0 [OPTIONS]

Options:
    -s, --suite SUITE       Test suite to run (smoke|robot|chess|security|all) [default: all]
    -b, --browser BROWSER   Browser to use (chromium|firefox|webkit|all) [default: chromium]
    -h, --headed           Run tests in headed mode (visible browser)
    -d, --debug            Run tests in debug mode
    -p, --parallel         Run tests in parallel [default: true]
    -r, --retry COUNT      Number of retries for failed tests [default: 1]
    -t, --timeout MS       Test timeout in milliseconds [default: 60000]
    -u, --url URL          Base URL for the kiosk UI [default: https://localhost:5173]
    --robot-url URL        Robot server URL [default: https://localhost:8000]
    --no-parallel          Disable parallel test execution
    --install              Install dependencies and browsers
    --report-only          Only generate and show reports
    --clean                Clean previous test results
    --help                 Show this help message

Test Suites:
    smoke       Basic functionality and health checks
    robot       Robot control and movement tests
    chess       Chess game functionality tests
    security    Security and error handling tests
    all         All test suites

Examples:
    $0                                    # Run all tests with default settings
    $0 --suite smoke --headed             # Run smoke tests in headed mode
    $0 --suite robot --browser firefox    # Run robot tests in Firefox
    $0 --debug --no-parallel              # Run all tests in debug mode, single-threaded
    $0 --install                          # Install dependencies and browsers
    $0 --clean --suite all                # Clean previous results and run all tests

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--suite)
                TEST_SUITE="$2"
                shift 2
                ;;
            -b|--browser)
                BROWSER="$2"
                shift 2
                ;;
            -h|--headed)
                HEADED=true
                shift
                ;;
            -d|--debug)
                DEBUG=true
                HEADED=true
                PARALLEL=false
                shift
                ;;
            -p|--parallel)
                PARALLEL=true
                shift
                ;;
            --no-parallel)
                PARALLEL=false
                shift
                ;;
            -r|--retry)
                RETRY_COUNT="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -u|--url)
                BASE_URL="$2"
                shift 2
                ;;
            --robot-url)
                ROBOT_SERVER_URL="$2"
                shift 2
                ;;
            --install)
                install_dependencies
                exit 0
                ;;
            --report-only)
                show_reports
                exit 0
                ;;
            --clean)
                clean_results
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Install dependencies and browsers
install_dependencies() {
    log_info "Installing dependencies and browsers..."
    
    cd "$SCRIPT_DIR"
    
    # Install npm dependencies
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        log_error "Neither pnpm nor npm found. Please install Node.js and npm."
        exit 1
    fi
    
    # Install Playwright browsers
    npx playwright install
    npx playwright install-deps
    
    log_success "Dependencies and browsers installed successfully"
}

# Clean previous test results
clean_results() {
    log_info "Cleaning previous test results..."
    
    if [[ -d "$REPORTS_DIR" ]]; then
        rm -rf "$REPORTS_DIR"
        mkdir -p "$REPORTS_DIR"/{screenshots,videos,traces,html-report}
    fi
    
    log_success "Previous test results cleaned"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check if dependencies are installed
    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        log_warning "Dependencies not found. Installing..."
        install_dependencies
    fi
    
    # Check if services are running
    if ! curl -k -s "$BASE_URL" > /dev/null; then
        log_warning "Kiosk UI not accessible at $BASE_URL"
        log_warning "Please ensure the kiosk UI is running"
    fi
    
    if ! curl -k -s "$ROBOT_SERVER_URL/health" > /dev/null; then
        log_warning "Robot server not accessible at $ROBOT_SERVER_URL"
        log_warning "Please ensure the robot server is running"
    fi
    
    log_success "Prerequisites check completed"
}

# Build test command
build_test_command() {
    local cmd="npx playwright test"
    
    # Add browser selection
    if [[ "$BROWSER" != "all" ]]; then
        cmd="$cmd --project=$BROWSER-desktop"
    fi
    
    # Add test suite selection
    case "$TEST_SUITE" in
        smoke)
            cmd="$cmd --grep @smoke"
            ;;
        robot)
            cmd="$cmd --grep @robot"
            ;;
        chess)
            cmd="$cmd --grep @chess"
            ;;
        security)
            cmd="$cmd --grep @security"
            ;;
        all)
            # Run all tests
            ;;
        *)
            log_error "Unknown test suite: $TEST_SUITE"
            exit 1
            ;;
    esac
    
    # Add execution options
    if [[ "$HEADED" == true ]]; then
        cmd="$cmd --headed"
    fi
    
    if [[ "$DEBUG" == true ]]; then
        cmd="$cmd --debug"
    fi
    
    if [[ "$PARALLEL" == false ]]; then
        cmd="$cmd --workers=1"
    fi
    
    # Add retry count
    cmd="$cmd --retries=$RETRY_COUNT"
    
    # Add timeout
    cmd="$cmd --timeout=$TIMEOUT"
    
    echo "$cmd"
}

# Run tests
run_tests() {
    log_info "Running E2E tests..."
    log_info "Suite: $TEST_SUITE"
    log_info "Browser: $BROWSER"
    log_info "Base URL: $BASE_URL"
    log_info "Robot Server URL: $ROBOT_SERVER_URL"
    
    cd "$SCRIPT_DIR"
    
    # Set environment variables
    export BASE_URL="$BASE_URL"
    export ROBOT_SERVER_URL="$ROBOT_SERVER_URL"
    export PWTEST_TIMEOUT="$TIMEOUT"
    
    # Build and execute test command
    local test_cmd
    test_cmd=$(build_test_command)
    
    log_info "Executing: $test_cmd"
    
    local exit_code=0
    if ! eval "$test_cmd"; then
        exit_code=$?
        log_error "Tests failed with exit code $exit_code"
    else
        log_success "All tests passed!"
    fi
    
    return $exit_code
}

# Generate test summary
generate_summary() {
    log_info "Generating test summary..."
    
    local results_file="$REPORTS_DIR/test-results.json"
    local summary_file="$REPORTS_DIR/test-summary.txt"
    
    if [[ -f "$results_file" ]]; then
        # Extract key metrics from results
        local total_tests
        local passed_tests
        local failed_tests
        local duration
        
        total_tests=$(jq -r '.stats.total // 0' "$results_file" 2>/dev/null || echo "0")
        passed_tests=$(jq -r '.stats.passed // 0' "$results_file" 2>/dev/null || echo "0")
        failed_tests=$(jq -r '.stats.failed // 0' "$results_file" 2>/dev/null || echo "0")
        duration=$(jq -r '.stats.duration // 0' "$results_file" 2>/dev/null || echo "0")
        
        # Convert duration to seconds
        local duration_sec=$((duration / 1000))
        
        # Generate summary
        cat > "$summary_file" << EOF
UR10 Robot Kiosk E2E Test Results
================================

Test Execution Summary:
  Date: $(date)
  Suite: $TEST_SUITE
  Browser: $BROWSER
  Base URL: $BASE_URL
  
Results:
  Total Tests: $total_tests
  Passed: $passed_tests
  Failed: $failed_tests
  Duration: ${duration_sec}s
  
Success Rate: $(( passed_tests * 100 / (total_tests > 0 ? total_tests : 1) ))%

Reports Available:
  - HTML Report: reports/html-report/index.html
  - JSON Results: reports/test-results.json
  - Screenshots: reports/screenshots/
  - Videos: reports/videos/
  - Traces: reports/traces/

EOF
        
        # Display summary
        cat "$summary_file"
        
        # Return appropriate exit code
        if [[ "$failed_tests" -gt 0 ]]; then
            return 1
        fi
    else
        log_warning "No test results found"
        return 1
    fi
    
    return 0
}

# Show test reports
show_reports() {
    log_info "Opening test reports..."
    
    local html_report="$REPORTS_DIR/html-report/index.html"
    
    if [[ -f "$html_report" ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$html_report"
        elif command -v open &> /dev/null; then
            open "$html_report"
        else
            log_info "HTML report available at: file://$html_report"
        fi
    else
        log_warning "No HTML report found. Run tests first."
    fi
}

# Archive test results
archive_results() {
    log_info "Archiving test results..."
    
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local archive_dir="$REPORTS_DIR/archives/test-run-$timestamp"
    
    mkdir -p "$archive_dir"
    
    # Copy important files
    local files_to_archive=(
        "test-results.json"
        "test-summary.txt"
        "junit-results.xml"
    )
    
    for file in "${files_to_archive[@]}"; do
        if [[ -f "$REPORTS_DIR/$file" ]]; then
            cp "$REPORTS_DIR/$file" "$archive_dir/"
        fi
    done
    
    # Copy HTML report
    if [[ -d "$REPORTS_DIR/html-report" ]]; then
        cp -r "$REPORTS_DIR/html-report" "$archive_dir/"
    fi
    
    log_success "Results archived to: $archive_dir"
}

# Main function
main() {
    log_info "Starting UR10 Robot Kiosk E2E Test Runner"
    
    parse_arguments "$@"
    check_prerequisites
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"/{screenshots,videos,traces,html-report,archives}
    
    # Run tests
    local test_exit_code=0
    if ! run_tests; then
        test_exit_code=$?
    fi
    
    # Generate summary
    local summary_exit_code=0
    if ! generate_summary; then
        summary_exit_code=$?
    fi
    
    # Archive results
    archive_results
    
    # Show reports if tests failed or in debug mode
    if [[ "$test_exit_code" -ne 0 ]] || [[ "$DEBUG" == true ]]; then
        show_reports
    fi
    
    # Final status
    if [[ "$test_exit_code" -eq 0 ]]; then
        log_success "E2E test execution completed successfully!"
    else
        log_error "E2E test execution completed with failures"
    fi
    
    exit $test_exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

