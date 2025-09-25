# Setup Guide

Prerequisites: Docker

## Quick Start

1. Setup Environment
```shell
# Clone repository
git clone <repository-url>
cd TodolistProject

# Create environment file
cp .env.example .env

# Edit if needed (optional)
nano .env
```

2. Start Application
```shell
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

3. Access Application
URL: http://localhost

## Default Users for login
| Username | Password |
| ----------- | ----------- |
| admin | password |
| john_doe | password |
| jane_smith | password |

\newpage