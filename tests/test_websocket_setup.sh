#!/bin/bash

echo "🚀 Todo WebSocket 测试脚本"
echo "=========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Docker 是否运行
echo -e "${BLUE}📋 检查 Docker 服务...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请启动 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 正在运行${NC}"

# 启动服务
echo -e "${BLUE}🚀 启动 Docker Compose 服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动 (30秒)...${NC}"
sleep 30

# 检查服务状态
echo -e "${BLUE}📊 检查服务状态...${NC}"
docker-compose ps

# 服务健康检查
echo -e "${BLUE}🏥 健康检查...${NC}"

services=(
    "http://localhost/health:Nginx Gateway"
    "http://localhost:8084/healthz:Auth Service"
    "http://localhost:8083/healthz:Team Service"
    "http://localhost:8081/healthz:Task Service"
    "http://localhost:8086/ping:Realtime Service"
)

for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    url="${ADDR[0]}"
    name="${ADDR[1]}"
    
    echo -n "  检查 $name... "
    if curl -s "$url" > /dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
done

# 检查 Kafka 主题
echo -e "${BLUE}📨 检查 Kafka 主题...${NC}"
echo "Kafka 主题列表:"
docker exec -it dev_kafka kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null || echo -e "${RED}❌ 无法连接到 Kafka${NC}"

echo ""
echo -e "${GREEN}🎉 服务启动完成！${NC}"
echo ""
echo -e "${YELLOW}📝 接下来的步骤：${NC}"
echo "1. 导入 Postman Collection: docs/Todo_WebSocket_Tests.postman_collection.json"
echo "2. 运行 '注册用户' 请求"
echo "3. 运行 '登录' 请求 (会自动保存 JWT token)"
echo "4. 运行 '创建团队' 请求 (会自动保存团队 ID)"
echo "5. 创建 WebSocket 连接: ws://localhost/ws?teamId={{team_id}}&userId={{user_id}}"
echo "6. 运行 '创建任务' 请求来触发 WebSocket 事件"
echo ""
echo -e "${BLUE}🔗 有用的链接：${NC}"
echo "- API Gateway: http://localhost"
echo "- Mailpit (邮件测试): http://localhost:8025"
echo "- Task DB phpMyAdmin: http://localhost:8082"
echo "- Auth DB phpMyAdmin: http://localhost:8085"
echo ""
echo -e "${YELLOW}📚 查看详细测试指南: docs/postman_websocket_testing.md${NC}"
