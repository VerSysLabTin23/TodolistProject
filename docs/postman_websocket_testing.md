# Postman WebSocket 测试指南 (用户级别连接)

## 🎯 重要更新

**WebSocket 现在基于 UserID，不再需要 TeamID！** 用户将接收到所有他们参与的团队中的任务和团队事件。

## 前置准备

### 1. 启动服务
```bash
cd /Users/hong/Study/DHBW/Semester4/TodolistProject
docker-compose up -d
```

### 2. 等待服务启动
```bash
# 检查服务状态
docker-compose ps

# 查看日志确认启动完成
docker-compose logs -f realtime
```

## Postman WebSocket 测试步骤

### 第一步：获取认证令牌

#### 1.1 注册用户
- **Method**: `POST`
- **URL**: `http://localhost/auth/register`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }
  ```

#### 1.2 登录获取 JWT Token
- **Method**: `POST`
- **URL**: `http://localhost/auth/login`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**📝 重要**: 保存返回的 `token` 和 `user.id`，后续步骤需要使用。

### 第二步：创建或获取团队

#### 2.1 获取现有团队列表
- **Method**: `GET`
- **URL**: `http://localhost/api/teams`
- **Headers**: 
  ```
  Authorization: Bearer YOUR_JWT_TOKEN
  ```

#### 2.2 创建新团队（可选）
- **Method**: `POST`
- **URL**: `http://localhost/api/teams`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "WebSocket测试团队",
    "description": "用于测试WebSocket功能的团队"
  }
  ```

#### 2.3 加入团队或添加成员
- **Method**: `POST`
- **URL**: `http://localhost/api/teams/{team_id}/members`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "userId": YOUR_USER_ID,
    "role": "member"
  }
  ```

### 第三步：建立 WebSocket 连接

#### 3.1 在 Postman 中创建 WebSocket 请求

1. 在 Postman 中点击 "New" → "WebSocket Request"
2. **URL**: `ws://localhost/ws?userId=YOUR_USER_ID`
   - 🎯 **新设计**: 只需要 `userId` 参数，不再需要 `teamId`
   - 例如: `ws://localhost/ws?userId=5`

3. 点击 "Connect"

#### 3.2 验证连接
如果连接成功，你应该在 WebSocket 界面底部看到：
```
✅ Connected to ws://localhost/ws?userId=5
```

### 第四步：测试实时事件

现在保持 WebSocket 连接打开，使用其他 Postman 标签页或 curl 命令触发事件。

#### 4.1 创建任务触发 `task.created` 事件

- **Method**: `POST`
- **URL**: `http://localhost/api/tasks/teams/{team_id}/tasks`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "title": "WebSocket测试任务",
    "description": "测试实时更新功能",
    "priority": "high",
    "due": "2025-01-15"
  }
  ```

**期望的WebSocket事件**:
```json
{
  "eventId": "20250826120000-abc123",
  "type": "task.created",
  "teamId": 1,
  "actorId": 5,
  "timestamp": "2025-08-26T12:00:00Z",
  "data": {
    "taskId": 123,
    "creatorId": 5,
    "assigneeId": null,
    "title": "WebSocket测试任务",
    "description": "测试实时更新功能",
    "completed": false,
    "priority": "high",
    "due": "2025-01-15"
  }
}
```

#### 4.2 更新任务触发 `task.updated` 事件

- **Method**: `PUT`
- **URL**: `http://localhost/api/tasks/{task_id}`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "title": "更新后的WebSocket测试任务",
    "priority": "medium",
    "completed": true
  }
  ```

#### 4.3 删除任务触发 `task.deleted` 事件

- **Method**: `DELETE`
- **URL**: `http://localhost/api/tasks/{task_id}`
- **Headers**: 
  ```
  Authorization: Bearer YOUR_JWT_TOKEN
  ```

#### 4.4 团队操作测试

**更新团队信息**:
- **Method**: `PUT`
- **URL**: `http://localhost/api/teams/{team_id}`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "更新后的团队名称",
    "description": "更新后的团队描述"
  }
  ```

**添加团队成员**:
- **Method**: `POST`
- **URL**: `http://localhost/api/teams/{team_id}/members`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
  ```
- **Body** (raw JSON):
  ```json
  {
    "userId": 2,
    "role": "member"
  }
  ```

### 第五步：多用户测试

#### 5.1 创建第二个用户

使用不同的用户信息重复第一步:
```json
{
  "username": "testuser2",
  "email": "test2@example.com", 
  "password": "password123"
}
```

#### 5.2 建立第二个WebSocket连接

在新的 Postman WebSocket 标签页中:
- **URL**: `ws://localhost/ws?userId=SECOND_USER_ID`

#### 5.3 验证跨用户实时更新

1. 将第二个用户添加到同一个团队
2. 用第一个用户创建/更新任务
3. 在第二个用户的WebSocket连接中观察实时事件

## 🎯 用户级别设计的优势

### 1. 单一连接
- 用户只需要建立一个WebSocket连接
- 自动接收所有参与团队的事件

### 2. 智能事件分发
- **任务事件**: 通知团队成员 + 任务创建者 + 任务分配者
- **团队事件**: 通知团队成员 + 团队所有者  
- **团队成员事件**: 通知团队成员 + 被影响的用户

### 3. 自动去重
- 系统自动去除重复的用户通知
- 确保每个用户只接收一份事件副本

## 🐛 故障排除

### WebSocket 连接失败

1. **检查服务状态**:
   ```bash
   docker-compose ps
   docker-compose logs realtime
   ```

2. **检查端口**:
   ```bash
   curl http://localhost/health
   curl http://localhost:8086/ping
   ```

3. **验证nginx配置**:
   ```bash
   docker-compose logs nginx
   ```

### JWT Token 过期

如果收到 401 错误，重新登录获取新的token:
```bash
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 事件未接收

1. **验证用户是团队成员**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost/api/teams/{team_id}/members
   ```

2. **检查realtime服务日志**:
   ```bash
   docker-compose logs -f realtime
   ```

## 📋 测试检查清单

- [ ] ✅ 成功注册和登录用户
- [ ] ✅ 获取JWT token
- [ ] ✅ 建立WebSocket连接 (只需userId)
- [ ] ✅ 创建任务并接收 `task.created` 事件
- [ ] ✅ 更新任务并接收 `task.updated` 事件  
- [ ] ✅ 删除任务并接收 `task.deleted` 事件
- [ ] ✅ 更新团队并接收 `team.updated` 事件
- [ ] ✅ 添加团队成员并接收 `team.member_added` 事件
- [ ] ✅ 创建第二个用户并测试跨用户实时更新
- [ ] ✅ 验证用户只接收相关团队的事件

## 🎉 成功！

如果所有测试都通过，恭喜！您的用户级别WebSocket实时更新系统正在正常工作。用户现在可以通过单一WebSocket连接接收所有相关团队的实时更新。

## 💡 后续步骤

1. **前端集成**: 将WebSocket功能集成到React/Vue应用中
2. **错误处理**: 实现连接重试和错误恢复机制
3. **性能优化**: 监控WebSocket连接数和事件分发性能
4. **安全加固**: 实现JWT token验证和用户权限检查