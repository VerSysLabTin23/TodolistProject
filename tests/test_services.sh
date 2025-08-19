#!/bin/bash

echo "🚀 Testing Todolist Project Services Integration"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test service health
test_service() {
    local service_name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $service_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test authentication flow
test_auth_flow() {
    echo -e "\n${YELLOW}Testing Authentication Flow:${NC}"
    
    # Test user registration
    echo -n "1. Testing user registration... "
    register_response=$(curl -s -X POST http://localhost:8084/auth/register \
        -H "Content-Type: application/json" \
        -d '{
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123",
            "firstName": "Test",
            "lastName": "User"
        }')
    
    if echo "$register_response" | grep -q "id"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $register_response"
    fi
    
    # Test user login
    echo -n "2. Testing user login... "
    login_response=$(curl -s -X POST http://localhost:8084/auth/login \
        -H "Content-Type: application/json" \
        -d '{
            "username": "testuser",
            "password": "testpass123"
        }')
    
    if echo "$login_response" | grep -q "accessToken"; then
        echo -e "${GREEN}✅ OK${NC}"
        
        # Extract token for further tests
        TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        echo "   Token extracted: ${TOKEN:0:20}..."
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $login_response"
    fi
    
    # Test JWT validation
    if [ ! -z "$TOKEN" ]; then
        echo -n "3. Testing JWT validation... "
        validate_response=$(curl -s -X POST http://localhost:8084/validate \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$validate_response" | grep -q "valid.*true"; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ Failed${NC}"
            echo "Response: $validate_response"
        fi
    fi
}

# Function to test team service
test_team_service() {
    echo -e "\n${YELLOW}Testing Team Service:${NC}"
    
    # Test team listing
    echo -n "1. Testing team listing... "
    teams_response=$(curl -s http://localhost:8083/teams)
    
    if echo "$teams_response" | grep -q "teams"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $teams_response"
    fi
}

# Function to test task service
test_task_service() {
    echo -e "\n${YELLOW}Testing Task Service:${NC}"
    
    # Test task listing
    echo -n "1. Testing task listing... "
    tasks_response=$(curl -s http://localhost:8081/teams/1/tasks)
    
    if echo "$tasks_response" | grep -q "tasks"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $tasks_response"
    fi
}

# Main test execution
echo -e "\n${YELLOW}Starting Service Health Checks:${NC}"

# Test all services
test_service "Auth Service" "http://localhost:8084/healthz" "200"
test_service "Team Service" "http://localhost:8083/healthz" "200"
test_service "Task Service" "http://localhost:8081/healthz" "200"

# Test authentication flow
test_auth_flow

# Test other services
test_team_service
test_task_service

echo -e "\n${GREEN}🎉 Service Integration Test Complete!${NC}"
echo -e "\n${YELLOW}Service URLs:${NC}"
echo "Auth Service: http://localhost:8084"
echo "Team Service: http://localhost:8083"
echo "Task Service: http://localhost:8081"
echo -e "\n${YELLOW}Database URLs:${NC}"
echo "Auth DB: localhost:3309"
echo "Team DB: localhost:3307"
echo "Task DB: localhost:3306"
echo -e "\n${YELLOW}phpMyAdmin URLs:${NC}"
echo "Auth phpMyAdmin: http://localhost:8085"
echo "Team phpMyAdmin: http://localhost:8084"
echo "Task phpMyAdmin: http://localhost:8082"
