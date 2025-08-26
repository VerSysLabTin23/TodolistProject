#!/bin/bash

# Test script for Task Service API
# Make sure the service is running on port 8081

BASE_URL="http://localhost:8081"

echo "Testing Task Service API..."
echo "=========================="

# Test health check
echo "1. Testing health check..."
curl -s "$BASE_URL/healthz"
echo -e "\n"

# Test listing tasks across teams
echo "2. Testing list tasks across teams..."
curl -s "$BASE_URL/tasks" | jq '.' 2>/dev/null || curl -s "$BASE_URL/tasks"
echo -e "\n"

# Test listing tasks in team 1
echo "3. Testing list tasks in team 1..."
curl -s "$BASE_URL/teams/1/tasks" | jq '.' 2>/dev/null || curl -s "$BASE_URL/teams/1/tasks"
echo -e "\n"

# Test creating a new task in team 1
echo "4. Testing create task in team 1..."
curl -s -X POST "$BASE_URL/teams/1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task from API",
    "description": "This is a test task created via API",
    "priority": "high",
    "due": "2025-08-30"
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/teams/1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task from API",
    "description": "This is a test task created via API",
    "priority": "high",
    "due": "2025-08-30"
  }'
echo -e "\n"

echo "API testing completed!"
echo "Note: Some endpoints may return errors if the database is not set up or if authentication is required."
