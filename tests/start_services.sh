#!/bin/bash

echo "🚀 Starting Todolist Project Services"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service_name to be ready... "
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Timeout${NC}"
    return 1
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to stop existing containers
cleanup() {
    echo -e "\n${YELLOW}Cleaning up existing containers...${NC}"
    docker compose down --remove-orphans
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Function to start databases first
start_databases() {
    echo -e "\n${BLUE}Starting Databases...${NC}"
    
    # Start all databases
    docker compose up -d auth-db team-db task-db
    
    # Wait for databases to be healthy
    echo -e "\n${YELLOW}Waiting for databases to be healthy...${NC}"
    
    # Wait for auth database
    docker compose exec -T auth-db mysqladmin ping -ppass --silent
    while [ $? -ne 0 ]; do
        echo "Waiting for auth-db..."
        sleep 2
        docker compose exec -T auth-db mysqladmin ping -ppass --silent
    done
    echo -e "${GREEN}✅ auth-db is healthy${NC}"
    
    # Wait for team database
    docker compose exec -T team-db mysqladmin ping -ppass --silent
    while [ $? -ne 0 ]; do
        echo "Waiting for team-db..."
        sleep 2
        docker compose exec -T team-db mysqladmin ping -ppass --silent
    done
    echo -e "${GREEN}✅ team-db is healthy${NC}"
    
    # Wait for task database
    docker compose exec -T task-db mysqladmin ping -ppass --silent
    while [ $? -ne 0 ]; do
        echo "Waiting for task-db..."
        sleep 2
        docker compose exec -T task-db mysqladmin ping -ppass --silent
    done
    echo -e "${GREEN}✅ task-db is healthy${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "\n${BLUE}Running Database Migrations...${NC}"
    
    # Run auth migrations
    echo "Running auth migrations..."
    docker compose up auth-dbmate
    
    # Run team migrations
    echo "Running team migrations..."
    docker compose up team-dbmate
    
    # Run task migrations
    echo "Running task migrations..."
    docker compose up dbmate
    
    echo -e "${GREEN}✅ All migrations complete${NC}"
}

# Function to start services
start_services() {
    echo -e "\n${BLUE}Starting Services...${NC}"
    
    # Start auth service first
    echo "Starting auth service..."
    docker compose up -d auth-service
    
    # Start team service
    echo "Starting team service..."
    docker compose up -d team-service
    
    # Start task service
    echo "Starting task service..."
    docker compose up -d task-service
    
    # Start phpMyAdmin instances
    echo "Starting phpMyAdmin instances..."
    docker compose up -d auth-phpmyadmin team-phpmyadmin task-phpmyadmin
    
    echo -e "${GREEN}✅ All services started${NC}"
}

# Function to wait for services to be ready
wait_for_services() {
    echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
    
    # Wait for auth service
    wait_for_service "Auth Service" "http://localhost:8084/healthz"
    
    # Wait for team service
    wait_for_service "Team Service" "http://localhost:8083/healthz"
    
    # Wait for task service
    wait_for_service "Task Service" "http://localhost:8081/healthz"
}

# Function to show service status
show_status() {
    echo -e "\n${GREEN}🎉 All Services Are Running!${NC}"
    echo -e "\n${YELLOW}Service URLs:${NC}"
    echo "Auth Service:     http://localhost:8084"
    echo "Team Service:     http://localhost:8083"
    echo "Task Service:     http://localhost:8081"
    
    echo -e "\n${YELLOW}Database URLs:${NC}"
    echo "Auth DB:          localhost:3309"
    echo "Team DB:          localhost:3307"
    echo "Task DB:          localhost:3306"
    
    echo -e "\n${YELLOW}phpMyAdmin URLs:${NC}"
    echo "Auth phpMyAdmin:  http://localhost:8085"
    echo "Team phpMyAdmin:  http://localhost:8084"
    echo "Task phpMyAdmin:  http://localhost:8082"
    
    echo -e "\n${YELLOW}Default Users:${NC}"
    echo "Admin:            admin / admin123"
    echo "Users:            john_doe, jane_smith, bob_wilson, alice_brown / admin123"
    
    echo -e "\n${BLUE}To test the services, run:${NC}"
    echo "./test_services.sh"
    
    echo -e "\n${BLUE}To stop all services, run:${NC}"
    echo "docker compose down"
}

# Main execution
main() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    check_docker
    
    echo -e "\n${YELLOW}Starting Todolist Project...${NC}"
    
    cleanup
    start_databases
    run_migrations
    start_services
    wait_for_services
    show_status
}

# Run main function
main
