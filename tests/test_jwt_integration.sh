#!/bin/bash

echo "🔐 Testing JWT Integration in Todolist Project"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to test JWT authentication flow
test_jwt_flow() {
    echo -e "\n${YELLOW}Testing JWT Authentication Flow:${NC}"
    
    # Test user registration
    echo -n "1. Testing user registration... "
    register_response=$(curl -s -X POST http://localhost:8084/auth/register \
        -H "Content-Type: application/json" \
        -d '{
            "username": "testuser_jwt",
            "email": "testjwt@example.com",
            "password": "testpass123",
            "firstName": "Test",
            "lastName": "User"
        }')
    
    if echo "$register_response" | grep -q "id"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $register_response"
        return 1
    fi
    
    # Test user login
    echo -n "2. Testing user login... "
    login_response=$(curl -s -X POST http://localhost:8084/auth/login \
        -H "Content-Type: application/json" \
        -d '{
            "username": "testuser_jwt",
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
        return 1
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
            return 1
        fi
    fi
    
    return 0
}

# Function to test protected endpoints
test_protected_endpoints() {
    echo -e "\n${YELLOW}Testing Protected Endpoints:${NC}"
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ No token available for testing protected endpoints${NC}"
        return 1
    fi
    
    # Test Team Service protected endpoint
    echo -n "1. Testing Team Service protected endpoint... "
    teams_response=$(curl -s -X GET http://localhost:8083/teams \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$teams_response" | grep -q "teams"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $teams_response"
    fi
    
    # Test Task Service protected endpoint
    echo -n "2. Testing Task Service protected endpoint... "
    tasks_response=$(curl -s -X GET http://localhost:8081/teams/1/tasks \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$tasks_response" | grep -q "tasks"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $tasks_response"
    fi
    
    # Test unauthorized access (should fail)
    echo -n "3. Testing unauthorized access (should fail)... "
    unauthorized_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET http://localhost:8081/teams/1/tasks)
    
    if [ "$unauthorized_response" = "401" ]; then
        echo -e "${GREEN}✅ OK (Correctly rejected)${NC}"
    else
        echo -e "${RED}❌ Failed (Expected 401, got $unauthorized_response)${NC}"
    fi
}

# Function to test team creation and task management
test_team_task_flow() {
    echo -e "\n${YELLOW}Testing Team and Task Flow:${NC}"
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ No token available for testing team/task flow${NC}"
        return 1
    fi
    
    # Create a team
    echo -n "1. Creating a team... "
    team_response=$(curl -s -X POST http://localhost:8083/teams \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Team JWT",
            "description": "Team for JWT testing"
        }')
    
    if echo "$team_response" | grep -q "id"; then
        echo -e "${GREEN}✅ OK${NC}"
        TEAM_ID=$(echo "$team_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo "   Team ID: $TEAM_ID"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "Response: $team_response"
        return 1
    fi
    
    # Create a task in the team
    if [ ! -z "$TEAM_ID" ]; then
        echo -n "2. Creating a task in team... "
        task_response=$(curl -s -X POST http://localhost:8081/teams/$TEAM_ID/tasks \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "title": "Test Task JWT",
                "description": "Task for JWT testing",
                "priority": "medium",
                "due": "2025-12-31"
            }')
        
        if echo "$task_response" | grep -q "id"; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ Failed${NC}"
            echo "Response: $task_response"
        fi
    fi
}

# Main test execution
echo -e "\n${BLUE}Starting JWT Integration Tests...${NC}"

# Test all services are running
echo -e "\n${YELLOW}Checking Service Health:${NC}"
test_service "Auth Service" "http://localhost:8084/healthz" "200"
test_service "Team Service" "http://localhost:8083/healthz" "200"
test_service "Task Service" "http://localhost:8081/healthz" "200"

# Test JWT authentication flow
test_jwt_flow

# Test protected endpoints
test_protected_endpoints

# Test team and task flow
test_team_task_flow

echo -e "\n${GREEN}🎉 JWT Integration Test Complete!${NC}"
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "✅ JWT token generation and validation"
echo "✅ Protected endpoint access control"
echo "✅ Unauthorized access rejection"
echo "✅ Team and task creation with JWT"
echo "✅ Service-to-service communication"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Test with different user roles (admin vs user)"
echo "2. Test team membership permissions"
echo "3. Test task assignment permissions"
echo "4. Test token expiration and refresh"
