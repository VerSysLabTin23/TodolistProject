#!/bin/bash

echo "🔧 API 路由测试脚本"
echo "==================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试路由函数
test_route() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "测试 $description: $url ... "
    
    # 使用 curl 获取状态码
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 通过 ($status)${NC}"
    else
        echo -e "${RED}❌ 失败 (期望: $expected_status, 实际: $status)${NC}"
    fi
}

echo -e "${BLUE}🏥 基础健康检查${NC}"
test_route "http://localhost/health" "200" "Nginx Gateway"
test_route "http://localhost:8084/healthz" "200" "Auth Service (直连)"
test_route "http://localhost:8083/healthz" "200" "Team Service (直连)"
test_route "http://localhost:8081/healthz" "200" "Task Service (直连)"
test_route "http://localhost:8086/ping" "200" "Realtime Service (直连)"

echo ""
echo -e "${BLUE}🔗 API 路由测试${NC}"
test_route "http://localhost/api/teams" "200" "团队列表 (无需认证)"
test_route "http://localhost/api/tasks" "401" "任务列表 (需要认证)"
test_route "http://localhost/auth/login" "400" "登录端点 (无数据)"

echo ""
echo -e "${BLUE}📝 特定路由测试${NC}"
test_route "http://localhost/api/teams/1" "200" "获取特定团队"
test_route "http://localhost/api/tasks/1" "401" "获取特定任务 (需要认证)"

echo ""
echo -e "${BLUE}🔄 WebSocket 测试${NC}"
echo "WebSocket 端点: ws://localhost/ws?teamId=1&userId=1"
echo "使用 wscat 测试: wscat -c 'ws://localhost/ws?teamId=1&userId=1'"

echo ""
echo -e "${GREEN}🎉 API 路由测试完成！${NC}"
echo ""
echo -e "${YELLOW}📝 后续步骤：${NC}"
echo "1. 使用 Postman 导入 Collection: docs/Todo_WebSocket_Tests.postman_collection.json"
echo "2. 先运行 '注册用户' 和 '登录' 获取 JWT Token"
echo "3. 使用 Token 测试需要认证的 API"
echo "4. 建立 WebSocket 连接测试实时更新"
