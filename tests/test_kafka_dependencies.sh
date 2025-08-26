#!/bin/bash

echo "🚀 测试Kafka依赖修复"
echo "===================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 第一步：停止所有服务${NC}"
docker-compose down

echo ""
echo -e "${BLUE}🔧 第二步：重新构建并启动服务${NC}"
echo "这将按正确的依赖顺序启动服务..."

# 启动服务并显示启动过程
docker-compose up -d

echo ""
echo -e "${BLUE}⏱️  第三步：等待服务启动完成${NC}"
sleep 10

echo ""
echo -e "${BLUE}📊 第四步：检查服务状态${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}🏥 第五步：检查关键服务健康状态${NC}"

# 检查Kafka
echo -n "检查 Kafka: "
kafka_status=$(docker exec dev_kafka kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 健康${NC}"
else
    echo -e "${RED}❌ 异常${NC}"
fi

# 检查notification服务
echo -n "检查 notification: "
notification_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/ping)
if [ "$notification_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($notification_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($notification_status)${NC}"
fi

# 检查realtime服务
echo -n "检查 realtime: "
realtime_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8086/ping 2>/dev/null)
if [ "$realtime_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($realtime_status)${NC}"
else
    echo -e "${YELLOW}⚠️ 无ping端点或异常 ($realtime_status)${NC}"
fi

# 检查task服务
echo -n "检查 task-service: "
task_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/ping 2>/dev/null)
if [ "$task_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($task_status)${NC}"
else
    echo -e "${YELLOW}⚠️ 无ping端点或异常 ($task_status)${NC}"
fi

# 检查team服务
echo -n "检查 team-service: "
team_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8083/ping 2>/dev/null)
if [ "$team_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($team_status)${NC}"
else
    echo -e "${YELLOW}⚠️ 无ping端点或异常 ($team_status)${NC}"
fi

# 检查auth服务
echo -n "检查 auth-service: "
auth_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8084/ping 2>/dev/null)
if [ "$auth_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($auth_status)${NC}"
else
    echo -e "${YELLOW}⚠️ 无ping端点或异常 ($auth_status)${NC}"
fi

# 检查mailpit
echo -n "检查 mailpit: "
mailpit_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8025)
if [ "$mailpit_status" = "200" ]; then
    echo -e "${GREEN}✅ 健康 ($mailpit_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($mailpit_status)${NC}"
fi

echo ""
echo -e "${BLUE}📋 第六步：检查服务启动日志${NC}"
echo -e "${YELLOW}--- Kafka 启动日志 (最后5行) ---${NC}"
docker-compose logs --tail=5 kafka

echo ""
echo -e "${YELLOW}--- Notification 启动日志 (最后5行) ---${NC}"
docker-compose logs --tail=5 notification

echo ""
echo -e "${YELLOW}--- Realtime 启动日志 (最后5行) ---${NC}"
docker-compose logs --tail=5 realtime

echo ""
echo -e "${GREEN}🎯 测试完成！${NC}"
echo ""
echo -e "${YELLOW}💡 后续步骤：${NC}"
echo "1. 如果所有服务都健康，尝试创建任务测试邮件功能"
echo "2. 访问 http://localhost:8025 查看mailpit是否收到邮件"
echo "3. 如果有服务异常，查看详细日志: docker-compose logs [service-name]"
