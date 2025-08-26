#!/bin/bash

echo "🔍 Mailpit 调试脚本"
echo "==================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 第一步：检查所有服务状态${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}🏥 第二步：检查服务健康状态${NC}"

# 检查mailpit
echo -n "检查 mailpit Web UI: "
mailpit_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8025)
if [ "$mailpit_status" = "200" ]; then
    echo -e "${GREEN}✅ 正常 ($mailpit_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($mailpit_status)${NC}"
fi

# 检查notification服务
echo -n "检查 notification 服务: "
notification_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/ping)
if [ "$notification_status" = "200" ]; then
    echo -e "${GREEN}✅ 正常 ($notification_status)${NC}"
else
    echo -e "${RED}❌ 异常 ($notification_status)${NC}"
fi

# 检查kafka
echo -n "检查 kafka: "
kafka_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:9092)
if [ "$kafka_status" = "000" ]; then
    echo -e "${YELLOW}⚠️ Kafka运行中 (端口开放)${NC}"
else
    echo -e "${RED}❌ Kafka无响应${NC}"
fi

echo ""
echo -e "${BLUE}📋 第三步：检查容器日志${NC}"

echo -e "${YELLOW}--- Mailpit 日志 (最后10行) ---${NC}"
docker-compose logs --tail=10 mailpit

echo ""
echo -e "${YELLOW}--- Notification 服务日志 (最后15行) ---${NC}"
docker-compose logs --tail=15 notification

echo ""
echo -e "${YELLOW}--- Kafka 日志 (最后10行) ---${NC}"
docker-compose logs --tail=10 kafka

echo ""
echo -e "${BLUE}🔍 第四步：测试SMTP连接${NC}"
echo "测试到mailpit的SMTP连接..."

# 使用telnet测试SMTP连接
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/localhost/1025' 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SMTP端口1025可访问${NC}"
else
    echo -e "${RED}❌ SMTP端口1025不可访问${NC}"
fi

echo ""
echo -e "${BLUE}🧪 第五步：手动测试邮件发送${NC}"
echo "尝试使用curl发送测试请求到notification服务..."

# 模拟一个简单的HTTP请求到notification服务
curl_response=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:8090/ping)
echo "Notification服务响应: $curl_response"

echo ""
echo -e "${BLUE}📊 第六步：检查Kafka主题${NC}"
echo "检查Kafka主题是否存在..."

# 尝试列出Kafka主题
docker exec dev_kafka kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null || echo "无法列出Kafka主题"

echo ""
echo -e "${GREEN}🎯 调试完成！${NC}"
echo ""
echo -e "${YELLOW}💡 后续步骤：${NC}"
echo "1. 如果mailpit Web UI正常，访问 http://localhost:8025 查看是否有邮件"
echo "2. 如果notification服务有问题，检查详细日志: docker-compose logs notification"
echo "3. 如果Kafka有问题，检查Kafka连接: docker-compose logs kafka"
echo "4. 手动测试: 创建任务或用户，观察日志变化"

