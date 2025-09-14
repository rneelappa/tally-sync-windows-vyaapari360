#!/bin/bash

# Railway API Monitoring Script
# Non-interactive monitoring without hanging CLI commands

API_URL="https://tally-sync-vyaapari360-production.up.railway.app/api/v1"
LOG_FILE="api-monitor.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_message() {
    local message=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

check_api_health() {
    local response=$(curl -s --max-time 10 "$API_URL/health" 2>/dev/null)
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local environment=$(echo "$response" | jq -r '.environment')
        local total_vouchers=$(echo "$response" | jq -r '.storage.totalVouchers')
        local companies=$(echo "$response" | jq -r '.storage.companies | length')
        
        echo -e "${GREEN}✅ API Healthy${NC}"
        echo "   Environment: $environment"
        echo "   Total Vouchers: $total_vouchers"
        echo "   Companies: $companies"
        
        log_message "API Health Check: SUCCESS - $total_vouchers vouchers, $companies companies"
        return 0
    else
        echo -e "${RED}❌ API Unhealthy${NC}"
        echo "   Response: $response"
        
        log_message "API Health Check: FAILED - $response"
        return 1
    fi
}

check_specific_endpoints() {
    echo "🔍 Testing specific endpoints..."
    
    # Test vouchers endpoint
    local vouchers_response=$(curl -s --max-time 10 "$API_URL/vouchers/SKM/MAIN?limit=1" 2>/dev/null)
    if echo "$vouchers_response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Vouchers endpoint working${NC}"
        log_message "Vouchers Endpoint: SUCCESS"
    else
        echo -e "${RED}❌ Vouchers endpoint failed${NC}"
        log_message "Vouchers Endpoint: FAILED - $vouchers_response"
    fi
}

# Main monitoring function
monitor_api() {
    echo "🚀 Starting Railway API Monitoring"
    echo "API URL: $API_URL"
    echo "Log file: $LOG_FILE"
    echo "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        echo "--- $(date) ---"
        
        if check_api_health; then
            check_specific_endpoints
        fi
        
        echo ""
        sleep 30
    done
}

# Quick health check (single run)
quick_check() {
    echo "🔍 Quick API Health Check"
    echo "API URL: $API_URL"
    echo ""
    
    if check_api_health; then
        check_specific_endpoints
        echo ""
        echo -e "${GREEN}🎉 API is working correctly!${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}💥 API is not responding!${NC}"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Railway API Monitor"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  monitor    Start continuous monitoring (default)"
    echo "  check      Quick health check"
    echo "  logs       Show recent logs"
    echo "  help       Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 monitor    # Start monitoring"
    echo "  $0 check      # Quick check"
    echo "  $0 logs       # Show logs"
}

# Show recent logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "📋 Recent API Monitor Logs:"
        echo "=========================="
        tail -20 "$LOG_FILE"
    else
        echo "No log file found. Run monitoring first."
    fi
}

# Main script logic
case "${1:-monitor}" in
    "monitor")
        monitor_api
        ;;
    "check")
        quick_check
        ;;
    "logs")
        show_logs
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac
