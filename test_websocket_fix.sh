#!/bin/bash

echo "🔧 WebSocket 修复测试脚本"
echo "========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 第一步：重新构建服务${NC}"
echo "构建 team-service..."
docker-compose build team-service

echo "构建 realtime..."
docker-compose build realtime

echo -e "${BLUE}🔄 第二步：重启服务${NC}"
echo "重启 team-service..."
docker-compose restart team-service

echo "重启 realtime..."
docker-compose restart realtime

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

echo -e "${BLUE}🏥 第三步：健康检查${NC}"

# 检查team服务
echo -n "检查 team-service: "
team_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8083/healthz)
if [ "$team_status" = "200" ]; then
    echo -e "${GREEN}✅ 正常 ($team_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($team_status)${NC}"
fi

# 检查realtime服务
echo -n "检查 realtime: "
realtime_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8086/ping)
if [ "$realtime_status" = "200" ]; then
    echo -e "${GREEN}✅ 正常 ($realtime_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($realtime_status)${NC}"
fi

echo -e "${BLUE}🔍 第四步：测试内部API端点${NC}"

# 测试内部端点
echo -n "测试 /internal/teams/1/members: "
internal_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8083/internal/teams/1/members)
if [ "$internal_status" = "200" ]; then
    echo -e "${GREEN}✅ 正常 ($internal_status)${NC}"
    echo "获取团队成员数据:"
    curl -s http://localhost:8083/internal/teams/1/members | head -c 200
    echo ""
else
    echo -e "${RED}❌ 异常 ($internal_status)${NC}"
fi

echo -e "${BLUE}📋 第五步：查看服务日志${NC}"
echo "Realtime 服务日志 (最后10行):"
docker-compose logs --tail=10 realtime

echo ""
echo -e "${GREEN}🎉 修复完成！${NC}"
echo ""
echo -e "${YELLOW}📝 后续测试步骤：${NC}"
echo "1. 确保用户3和用户5连接到WebSocket: ws://localhost/ws?userId=3 和 ws://localhost/ws?userId=5"
echo "2. 让用户4在团队2中创建任务"
echo "3. 观察realtime服务的详细日志: docker-compose logs -f realtime"
echo "4. 验证用户3和用户5是否收到WebSocket消息"
