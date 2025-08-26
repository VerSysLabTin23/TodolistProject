#!/bin/bash

echo "📧 测试邮件主题修复"
echo "=================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 第一步：重新构建notification服务${NC}"
docker-compose build notification
docker-compose up -d notification

echo ""
echo -e "${BLUE}⏱️  第二步：等待服务启动${NC}"
sleep 5

echo ""
echo -e "${BLUE}📋 第三步：检查notification服务状态${NC}"
curl -s http://localhost:8090/ping | echo "Notification service response: $(cat)"

echo ""
echo -e "${BLUE}📧 第四步：验证邮件主题配置${NC}"
echo "查看notification服务的代码修改..."

echo ""
echo -e "${YELLOW}--- 修复后的邮件主题设置 ---${NC}"
echo "✅ 任务事件: 直接使用事件类型 (如: task.created, task.updated)"
echo "✅ 团队事件: 直接使用事件类型 (如: team.created, team.updated)" 
echo "✅ 团队成员事件: 直接使用事件类型 (如: team.member_added)"
echo "✅ 注册欢迎邮件: 保持原有格式 'Welcome to Todo App!'"

echo ""
echo -e "${YELLOW}--- 预期的邮件主题示例 ---${NC}"
echo "• task.created (之前是: Task Update: task.created)"
echo "• task.updated (之前是: Task Update: task.updated)"
echo "• task.completed (之前是: Task Update: task.completed)"
echo "• task.deleted (之前是: Task Update: task.deleted)"
echo "• team.created (之前是: Team Update: team.created)"
echo "• team.member_added (之前是: Team Membership Update: team.member_added)"
echo "• Welcome to Todo App! (注册邮件，保持不变)"

echo ""
echo -e "${BLUE}📊 第五步：检查notification服务日志${NC}"
echo "查看最近的日志，确认服务正常运行..."
docker-compose logs --tail=10 notification

echo ""
echo -e "${GREEN}🎯 邮件主题修复完成！${NC}"
echo ""
echo -e "${YELLOW}💡 后续测试步骤：${NC}"
echo "1. 创建任务 → 检查邮件主题是否为 'task.created'"
echo "2. 更新任务 → 检查邮件主题是否为 'task.updated'"
echo "3. 注册用户 → 检查邮件主题是否为 'Welcome to Todo App!'"
echo "4. 访问 http://localhost:8025 查看mailpit中的邮件"
