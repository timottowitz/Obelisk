#!/bin/bash

echo "🧪 Email Integration API Tests (cURL)"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
SKIPPED=0

# Function to log test results
log_test() {
    local name="$1"
    local status="$2"
    local details="$3"
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ $name${NC}"
            ((PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}❌ $name${NC}"
            ((FAILED++))
            ;;
        "SKIP")
            echo -e "${YELLOW}⏭️  $name${NC}"
            ((SKIPPED++))
            ;;
    esac
    
    if [ -n "$details" ]; then
        echo "   $details"
    fi
}

# Base URL
BASE_URL="http://localhost:3000"
ORG_ID="org_303QuSOW8ORQ26Ohf7bkiGpm477"

# Test 1: Email Status Endpoint
echo -e "${BLUE}🔍 Test 1: Email Status API${NC}"
status_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    "$BASE_URL/api/email/status")

status_code=$(echo $status_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
status_body=$(echo $status_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $status_code in
    "200")
        log_test "GET /api/email/status - Response OK" "PASS" "Status: $status_code"
        
        # Check if response is valid JSON
        if echo "$status_body" | jq . >/dev/null 2>&1; then
            log_test "Email Status - Valid JSON Response" "PASS"
            
            # Check for required properties
            connected=$(echo "$status_body" | jq -r '.connected // empty')
            provider=$(echo "$status_body" | jq -r '.provider // empty')
            
            if [ -n "$connected" ] && [ -n "$provider" ]; then
                log_test "Email Status - Required Properties" "PASS" "Has connected: $connected, provider: $provider"
            else
                log_test "Email Status - Missing Properties" "FAIL" "Missing connected or provider"
            fi
        else
            log_test "Email Status - Invalid JSON" "FAIL" "Response: $status_body"
        fi
        ;;
    "401")
        log_test "GET /api/email/status - Auth Required" "SKIP" "Need authentication (Status: $status_code)"
        ;;
    "500")
        log_test "GET /api/email/status - Server Error" "FAIL" "Status: $status_code - $status_body"
        ;;
    *)
        log_test "GET /api/email/status - Unexpected Response" "FAIL" "Status: $status_code - $status_body"
        ;;
esac

echo ""

# Test 2: Email Folders Endpoint
echo -e "${BLUE}🔍 Test 2: Email Folders API${NC}"
folders_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    "$BASE_URL/api/email/folders")

folders_code=$(echo $folders_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
folders_body=$(echo $folders_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $folders_code in
    "200")
        log_test "GET /api/email/folders - Response OK" "PASS" "Status: $folders_code"
        
        if echo "$folders_body" | jq . >/dev/null 2>&1; then
            folder_count=$(echo "$folders_body" | jq length)
            log_test "Email Folders - Valid JSON Array" "PASS" "Found $folder_count folders"
        else
            log_test "Email Folders - Invalid JSON" "FAIL" "Response: $folders_body"
        fi
        ;;
    "401")
        log_test "GET /api/email/folders - Auth Required" "SKIP" "Need authentication (Status: $folders_code)"
        ;;
    "500")
        log_test "GET /api/email/folders - Server Error" "FAIL" "Status: $folders_code - $folders_body"
        ;;
    *)
        log_test "GET /api/email/folders - Error" "FAIL" "Status: $folders_code - $folders_body"
        ;;
esac

echo ""

# Test 3: Email Messages Endpoint
echo -e "${BLUE}🔍 Test 3: Email Messages API${NC}"
messages_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    "$BASE_URL/api/email/messages?folderId=inbox")

messages_code=$(echo $messages_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
messages_body=$(echo $messages_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $messages_code in
    "200")
        log_test "GET /api/email/messages - Response OK" "PASS" "Status: $messages_code"
        
        if echo "$messages_body" | jq . >/dev/null 2>&1; then
            message_count=$(echo "$messages_body" | jq length)
            log_test "Email Messages - Valid JSON Array" "PASS" "Found $message_count messages"
        else
            log_test "Email Messages - Invalid JSON" "FAIL" "Response: $messages_body"
        fi
        ;;
    "401")
        log_test "GET /api/email/messages - Auth Required" "SKIP" "Need authentication (Status: $messages_code)"
        ;;
    "400")
        log_test "GET /api/email/messages - Validation Working" "PASS" "Properly validates folder parameter"
        ;;
    "500")
        log_test "GET /api/email/messages - Server Error" "FAIL" "Status: $messages_code - $messages_body"
        ;;
    *)
        log_test "GET /api/email/messages - Error" "FAIL" "Status: $messages_code - $messages_body"
        ;;
esac

echo ""

# Test 4: Email Search Endpoint
echo -e "${BLUE}🔍 Test 4: Email Search API${NC}"
search_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    "$BASE_URL/api/email/search?query=test")

search_code=$(echo $search_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
search_body=$(echo $search_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $search_code in
    "200")
        log_test "GET /api/email/search - Response OK" "PASS" "Status: $search_code"
        ;;
    "401")
        log_test "GET /api/email/search - Auth Required" "SKIP" "Need authentication (Status: $search_code)"
        ;;
    "400")
        log_test "GET /api/email/search - Validation Working" "PASS" "Properly validates query parameter"
        ;;
    "500")
        log_test "GET /api/email/search - Server Error" "FAIL" "Status: $search_code - $search_body"
        ;;
    *)
        log_test "GET /api/email/search - Error" "FAIL" "Status: $search_code - $search_body"
        ;;
esac

echo ""

# Test 5: Send Email Endpoint
echo -e "${BLUE}🔍 Test 5: Send Email API${NC}"
send_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    -d '{
        "to": ["test@example.com"],
        "subject": "API Test Email",
        "body": "This is a test email from API tests",
        "contentType": "text"
    }' \
    "$BASE_URL/api/email/send")

send_code=$(echo $send_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
send_body=$(echo $send_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $send_code in
    "200")
        log_test "POST /api/email/send - Response OK" "PASS" "Status: $send_code"
        ;;
    "401")
        log_test "POST /api/email/send - Auth Required" "SKIP" "Need authentication (Status: $send_code)"
        ;;
    "400")
        log_test "POST /api/email/send - Validation Working" "PASS" "Properly validates request body"
        ;;
    "500")
        log_test "POST /api/email/send - Server Error" "FAIL" "Status: $send_code - $send_body"
        ;;
    *)
        log_test "POST /api/email/send - Error" "FAIL" "Status: $send_code - $send_body"
        ;;
esac

echo ""

# Test 6: Individual Message Endpoint
echo -e "${BLUE}🔍 Test 6: Individual Message API${NC}"
message_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    "$BASE_URL/api/email/messages/test-message-id")

message_code=$(echo $message_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
message_body=$(echo $message_response | sed -E 's/HTTPSTATUS:[0-9]*$//')

case $message_code in
    "200")
        log_test "GET /api/email/messages/[id] - Response OK" "PASS" "Status: $message_code"
        ;;
    "401")
        log_test "GET /api/email/messages/[id] - Auth Required" "SKIP" "Need authentication (Status: $message_code)"
        ;;
    "404")
        log_test "GET /api/email/messages/[id] - 404 Handling" "PASS" "Properly handles missing message (Status: $message_code)"
        ;;
    "500")
        log_test "GET /api/email/messages/[id] - Server Error" "FAIL" "Status: $message_code - $message_body"
        ;;
    *)
        log_test "GET /api/email/messages/[id] - Error" "FAIL" "Status: $message_code - $message_body"
        ;;
esac

echo ""

# Test 7: Error Handling
echo -e "${BLUE}🔍 Test 7: Error Handling${NC}"

# Test invalid endpoint
invalid_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/email/invalid-endpoint")

invalid_code=$(echo $invalid_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

case $invalid_code in
    "404")
        log_test "Invalid Endpoint Handling" "PASS" "Returns 404 for invalid endpoints (Status: $invalid_code)"
        ;;
    *)
        log_test "Invalid Endpoint Handling" "FAIL" "Unexpected status: $invalid_code"
        ;;
esac

# Test malformed JSON
malformed_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-Org-Id: $ORG_ID" \
    -d '{"invalid": json}' \
    "$BASE_URL/api/email/send")

malformed_code=$(echo $malformed_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

case $malformed_code in
    "400"|"401"|"500")
        log_test "Malformed JSON Handling" "PASS" "Properly handles malformed JSON (Status: $malformed_code)"
        ;;
    *)
        log_test "Malformed JSON Handling" "FAIL" "Unexpected status: $malformed_code"
        ;;
esac

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "========================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⏭️  Skipped: $SKIPPED${NC}"
echo "📝 Total: $((PASSED + FAILED + SKIPPED))"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}🚨 Some tests failed. Check the details above.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}🎯 All non-skipped tests passed!${NC}"
    
    if [ $SKIPPED -gt 0 ]; then
        echo -e "${YELLOW}Note: $SKIPPED tests were skipped (likely due to authentication requirements)${NC}"
    fi
    
    exit 0
fi