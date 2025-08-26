#!/bin/bash

echo "🔍 启动Conduktor Kafka监控"
echo "========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查主项目Kafka是否运行
echo -e "${BLUE}📋 第一步：检查主项目Kafka状态${NC}"
cd ..
kafka_status=$(docker-compose ps kafka | grep "Up" | wc -l)

if [ "$kafka_status" -eq 0 ]; then
    echo -e "${RED}❌ 主项目Kafka未运行${NC}"
    echo -e "${YELLOW}正在启动主项目Kafka...${NC}"
    docker-compose up -d kafka
    echo -e "${BLUE}等待Kafka启动...${NC}"
    sleep 10
else
    echo -e "${GREEN}✅ 主项目Kafka正在运行${NC}"
fi

# 启动Conduktor
echo ""
echo -e "${BLUE}🚀 第二步：启动Conduktor监控${NC}"
cd conduktor

# 停止可能存在的旧实例
echo "停止现有Conduktor实例..."
docker-compose -f docker-compose-fixed.yml down 2>/dev/null

# 启动新实例
echo "启动Conduktor..."
docker-compose -f docker-compose-fixed.yml up -d

echo ""
echo -e "${BLUE}⏱️  第三步：等待服务启动${NC}"
sleep 15

# 检查服务状态
echo ""
echo -e "${BLUE}📊 第四步：检查服务状态${NC}"
docker-compose -f docker-compose-fixed.yml ps

# 检查Web UI访问
echo ""
echo -e "${BLUE}🌐 第五步：检查Web UI访问${NC}"
web_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8087)
if [ "$web_status" = "200" ]; then
    echo -e "${GREEN}✅ Conduktor Web UI可访问 (http://localhost:8087)${NC}"
else
    echo -e "${YELLOW}⚠️ Conduktor Web UI可能还在启动中 (状态: $web_status)${NC}"
    echo -e "${YELLOW}请稍等片刻后访问 http://localhost:8087${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Conduktor启动完成！${NC}"
echo ""
echo -e "${YELLOW}💡 使用指南：${NC}"
echo "1. 访问Conduktor: http://localhost:8087"
echo "2. 集群名称: 'Todo Dev Kafka'"
echo "3. 监控主题: task.*, team.*, user.*"
echo "4. 停止Conduktor: cd conduktor && docker-compose -f docker-compose-fixed.yml down"
echo ""
echo -e "${BLUE}📋 Kafka集群信息：${NC}"
echo "- Bootstrap Servers: dev_kafka:9092"
echo "- 容器名称: dev_kafka"
echo "- 网络: todo-dev_app-net"
