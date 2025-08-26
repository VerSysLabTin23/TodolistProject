# Conduktor Kafka监控设置

## 🔍 概述
Conduktor是一个强大的Kafka监控和管理工具，用于监控我们Todo项目的Kafka集群。

## 📋 配置文件说明

### 1. `docker-compose.yml` (原始配置)
- ❌ **问题**: 使用自己的Redpanda集群，与项目Kafka隔离
- ❌ **问题**: 端口8080可能与项目服务冲突
- ❌ **问题**: 包含不必要的数据生成器和Gateway

### 2. `docker-compose-fixed.yml` (修复后配置) ✅
- ✅ **修复**: 连接到项目的`dev_kafka:9092`
- ✅ **修复**: 使用端口8087避免冲突
- ✅ **修复**: 连接到项目网络`todo-dev_app-net`
- ✅ **修复**: 移除不必要的服务，只保留监控功能

## 🚀 快速启动

### 方式1: 使用脚本启动 (推荐)
```bash
cd conduktor
./start-conduktor.sh
```

### 方式2: 手动启动
```bash
# 1. 确保主项目Kafka运行
docker-compose up -d kafka

# 2. 启动Conduktor
cd conduktor
docker-compose -f docker-compose-fixed.yml up -d

# 3. 访问Web UI
open http://localhost:8087
```

## 🌐 访问信息

- **Web UI**: http://localhost:8087
- **集群名称**: "Todo Dev Kafka"
- **Kafka地址**: dev_kafka:9092

## 📊 监控内容

在Conduktor中您可以监控：

### 主题 (Topics)
- `task.created` - 任务创建事件
- `task.updated` - 任务更新事件
- `task.completed` - 任务完成事件
- `task.deleted` - 任务删除事件
- `team.created` - 团队创建事件
- `team.updated` - 团队更新事件
- `team.deleted` - 团队删除事件
- `team.member_added` - 成员加入事件
- `team.member_removed` - 成员移除事件
- `user.created` - 用户注册事件

### 消费者组 (Consumer Groups)
- `notification-service` - 邮件通知服务
- `realtime-service` - WebSocket实时服务

### 指标监控
- 消息生产率
- 消费延迟
- 分区分布
- 连接状态

## 🛠️ 故障排除

### 问题1: 无法连接到Kafka
**原因**: 主项目Kafka未运行或网络配置错误
**解决**:
```bash
# 检查Kafka状态
docker-compose ps kafka

# 重启Kafka
docker-compose restart kafka
```

### 问题2: Web UI无法访问
**原因**: Conduktor服务未完全启动
**解决**:
```bash
# 查看启动日志
docker-compose -f docker-compose-fixed.yml logs conduktor-console

# 等待更长时间（首次启动需要下载镜像）
```

### 问题3: 端口冲突
**原因**: 端口8081被占用
**解决**: 修改`docker-compose-fixed.yml`中的端口映射

## 🔧 配置优化

### 生产环境建议
1. 使用外部PostgreSQL数据库
2. 配置持久化存储
3. 设置适当的资源限制
4. 启用监控和告警

### 开发环境
当前配置已针对开发环境优化：
- 简化的服务组合
- 快速启动
- 最小资源占用

## 📚 更多资源

- [Conduktor官方文档](https://docs.conduktor.io/)
- [Kafka监控最佳实践](https://docs.conduktor.io/platform/guides/)
- [生产部署指南](https://docs.conduktor.io/platform/category/deployment-options/)
