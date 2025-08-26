#!/bin/bash

echo "🔍 快速调试脚本"
echo "==============="

echo "1. 检查服务状态:"
docker-compose ps | grep -E "(mailpit|notification|kafka)"

echo ""
echo "2. 检查mailpit Web UI:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8025

echo ""
echo "3. 检查notification服务:"
curl -s http://localhost:8090/ping

echo ""
echo "4. notification服务日志 (最后10行):"
docker-compose logs --tail=10 notification

echo ""
echo "5. mailpit日志 (最后5行):"
docker-compose logs --tail=5 mailpit

echo ""
echo "6. 检查Kafka主题:"
docker exec dev_kafka kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null || echo "无法连接Kafka"

