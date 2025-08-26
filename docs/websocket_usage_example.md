# WebSocket Usage Examples

## Overview

This document provides examples of how to use the **User-Based WebSocket** functionality for real-time updates in the Todo application.

**🎯 重要更新**: WebSocket现在基于UserID，而不再需要TeamID。用户将接收到所有他们参与的团队中的任务和团队事件。

## WebSocket Connection

### Frontend JavaScript Example

```javascript
// Connect to WebSocket (只需要用户ID)
const userId = 123;
const ws = new WebSocket(`ws://localhost/ws?userId=${userId}`);

ws.onopen = function(event) {
    console.log('Connected to WebSocket for user:', userId);
};

ws.onmessage = function(event) {
    const eventData = JSON.parse(event.data);
    handleRealtimeEvent(eventData);
};

ws.onclose = function(event) {
    console.log('WebSocket connection closed');
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};

// Handle incoming real-time events
function handleRealtimeEvent(event) {
    console.log('Received event:', event);
    
    switch(event.type) {
        case 'task.created':
            handleTaskCreated(event.data);
            break;
        case 'task.updated':
            handleTaskUpdated(event.data);
            break;
        case 'task.deleted':
            handleTaskDeleted(event.data);
            break;
        case 'task.completed':
            handleTaskCompleted(event.data);
            break;
        case 'team.created':
            handleTeamCreated(event.data);
            break;
        case 'team.updated':
            handleTeamUpdated(event.data);
            break;
        case 'team.deleted':
            handleTeamDeleted(event.data);
            break;
        case 'team.member_added':
            handleMemberAdded(event.data);
            break;
        case 'team.member_removed':
            handleMemberRemoved(event.data);
            break;
        case 'team.member_role_updated':
            handleMemberRoleUpdated(event.data);
            break;
        default:
            console.log('Unknown event type:', event.type);
    }
}

// Event handlers
function handleTaskCreated(taskData) {
    // Add new task to UI
    const taskElement = createTaskElement(taskData);
    const teamSection = getOrCreateTeamSection(taskData.teamId);
    teamSection.querySelector('.task-list').appendChild(taskElement);
    
    // Show notification
    showNotification(`New task created: ${taskData.title}`, 'success');
}

function handleTaskUpdated(taskData) {
    // Update existing task in UI
    const taskElement = document.getElementById(`task-${taskData.taskId}`);
    if (taskElement) {
        updateTaskElement(taskElement, taskData);
    }
    
    // Show notification
    showNotification(`Task updated: ${taskData.title}`, 'info');
}

function handleTaskDeleted(taskData) {
    // Remove task from UI
    const taskElement = document.getElementById(`task-${taskData.taskId}`);
    if (taskElement) {
        taskElement.remove();
    }
    
    // Show notification
    showNotification(`Task deleted: ${taskData.title}`, 'warning');
}

function handleTaskCompleted(taskData) {
    // Update task completion status
    const taskElement = document.getElementById(`task-${taskData.taskId}`);
    if (taskElement) {
        const checkbox = taskElement.querySelector('.task-completed');
        if (checkbox) {
            checkbox.checked = taskData.completed;
        }
        taskElement.classList.toggle('completed', taskData.completed);
    }
    
    // Show notification
    const status = taskData.completed ? 'completed' : 'reopened';
    showNotification(`Task ${status}: ${taskData.title}`, 'success');
}

function handleTeamCreated(teamData) {
    // Add new team section to UI
    const teamSection = createTeamSection(teamData);
    document.getElementById('teams-container').appendChild(teamSection);
    
    // Show notification
    showNotification(`New team created: ${teamData.name}`, 'success');
}

function handleTeamUpdated(teamData) {
    // Update team information
    const teamSection = document.getElementById(`team-${teamData.teamId}`);
    if (teamSection) {
        const titleElement = teamSection.querySelector('.team-title');
        const descElement = teamSection.querySelector('.team-description');
        if (titleElement) titleElement.textContent = teamData.name;
        if (descElement && teamData.description) descElement.textContent = teamData.description;
    }
    
    // Show notification
    showNotification(`Team updated: ${teamData.name}`, 'info');
}

function handleTeamDeleted(teamData) {
    // Remove team section
    const teamSection = document.getElementById(`team-${teamData.teamId}`);
    if (teamSection) {
        teamSection.remove();
    }
    
    // Show notification
    showNotification(`Team deleted: ${teamData.name}`, 'warning');
}

function handleMemberAdded(memberData) {
    // Update team members list
    addTeamMember(memberData.teamId, memberData.userId, memberData.role);
    
    // Show notification
    showNotification(`New team member added with role: ${memberData.role}`, 'info');
}

function handleMemberRemoved(memberData) {
    // Remove from team members list
    removeTeamMember(memberData.teamId, memberData.userId);
    
    // Show notification
    showNotification('Team member removed', 'info');
}

function handleMemberRoleUpdated(memberData) {
    // Update member role
    updateMemberRole(memberData.teamId, memberData.userId, memberData.role);
    
    // Show notification
    showNotification(`Member role updated to: ${memberData.role}`, 'info');
}

// Utility functions
function createTaskElement(taskData) {
    const div = document.createElement('div');
    div.id = `task-${taskData.taskId}`;
    div.className = `task-item priority-${taskData.priority}`;
    if (taskData.completed) div.classList.add('completed');
    
    div.innerHTML = `
        <input type="checkbox" class="task-completed" ${taskData.completed ? 'checked' : ''}>
        <div class="task-content">
            <span class="task-title">${taskData.title}</span>
            ${taskData.description ? `<p class="task-description">${taskData.description}</p>` : ''}
            <div class="task-meta">
                <span class="task-priority priority-${taskData.priority}">${taskData.priority}</span>
                <span class="task-due">${taskData.due}</span>
                <span class="task-assignee">Assignee: ${taskData.assigneeId || 'Unassigned'}</span>
            </div>
        </div>
    `;
    return div;
}

function updateTaskElement(element, taskData) {
    const titleSpan = element.querySelector('.task-title');
    const descPara = element.querySelector('.task-description');
    const prioritySpan = element.querySelector('.task-priority');
    const dueSpan = element.querySelector('.task-due');
    const assigneeSpan = element.querySelector('.task-assignee');
    const checkbox = element.querySelector('.task-completed');
    
    if (titleSpan && taskData.title) titleSpan.textContent = taskData.title;
    if (descPara && taskData.description) descPara.textContent = taskData.description;
    if (prioritySpan && taskData.priority) {
        prioritySpan.textContent = taskData.priority;
        prioritySpan.className = `task-priority priority-${taskData.priority}`;
        element.className = `task-item priority-${taskData.priority}`;
    }
    if (dueSpan && taskData.due) dueSpan.textContent = taskData.due;
    if (assigneeSpan) assigneeSpan.textContent = `Assignee: ${taskData.assigneeId || 'Unassigned'}`;
    if (checkbox && taskData.completed !== undefined) {
        checkbox.checked = taskData.completed;
        element.classList.toggle('completed', taskData.completed);
    }
}

function createTeamSection(teamData) {
    const section = document.createElement('div');
    section.id = `team-${teamData.teamId}`;
    section.className = 'team-section';
    section.innerHTML = `
        <div class="team-header">
            <h3 class="team-title">${teamData.name}</h3>
            <p class="team-description">${teamData.description || ''}</p>
            <div class="team-members" id="team-${teamData.teamId}-members"></div>
        </div>
        <div class="task-list" id="team-${teamData.teamId}-tasks"></div>
    `;
    return section;
}

function getOrCreateTeamSection(teamId) {
    let section = document.getElementById(`team-${teamId}`);
    if (!section) {
        // If team section doesn't exist, create a basic one
        section = createTeamSection({ teamId, name: `Team ${teamId}`, description: '' });
        document.getElementById('teams-container').appendChild(section);
    }
    return section;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    const container = document.getElementById('notifications') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function addTeamMember(teamId, userId, role) {
    const membersList = document.getElementById(`team-${teamId}-members`);
    if (membersList) {
        const memberElement = document.createElement('div');
        memberElement.id = `member-${teamId}-${userId}`;
        memberElement.className = 'team-member';
        memberElement.innerHTML = `<span>User ${userId}</span> <span class="role role-${role}">${role}</span>`;
        membersList.appendChild(memberElement);
    }
}

function removeTeamMember(teamId, userId) {
    const memberElement = document.getElementById(`member-${teamId}-${userId}`);
    if (memberElement) {
        memberElement.remove();
    }
}

function updateMemberRole(teamId, userId, role) {
    const memberElement = document.getElementById(`member-${teamId}-${userId}`);
    if (memberElement) {
        const roleSpan = memberElement.querySelector('.role');
        if (roleSpan) {
            roleSpan.textContent = role;
            roleSpan.className = `role role-${role}`;
        }
    }
}
```

## React Hook Example (Updated for User-Based Connection)

```javascript
import { useState, useEffect, useRef } from 'react';

export function useWebSocket(userId) {
    const [events, setEvents] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const ws = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const wsUrl = `ws://localhost/ws?userId=${userId}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setConnectionStatus('Connected');
            console.log('WebSocket connected for user:', userId);
        };

        ws.current.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            setEvents(prev => [...prev, eventData]);
        };

        ws.current.onclose = () => {
            setConnectionStatus('Disconnected');
            console.log('WebSocket disconnected');
        };

        ws.current.onerror = (error) => {
            setConnectionStatus('Error');
            console.error('WebSocket error:', error);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [userId]);

    return { events, connectionStatus };
}

// Usage in component (simplified - no need for teamId anymore)
function Dashboard({ userId }) {
    const { events, connectionStatus } = useWebSocket(userId);
    const [tasksByTeam, setTasksByTeam] = useState({});
    const [teams, setTeams] = useState({});

    useEffect(() => {
        events.forEach(event => {
            switch(event.type) {
                case 'task.created':
                    setTasksByTeam(prev => ({
                        ...prev,
                        [event.teamId]: [...(prev[event.teamId] || []), event.data]
                    }));
                    break;
                    
                case 'task.updated':
                    setTasksByTeam(prev => ({
                        ...prev,
                        [event.teamId]: (prev[event.teamId] || []).map(task => 
                            task.taskId === event.data.taskId ? {...task, ...event.data} : task
                        )
                    }));
                    break;
                    
                case 'task.deleted':
                    setTasksByTeam(prev => ({
                        ...prev,
                        [event.teamId]: (prev[event.teamId] || []).filter(task => 
                            task.taskId !== event.data.taskId
                        )
                    }));
                    break;
                    
                case 'team.created':
                    setTeams(prev => ({
                        ...prev,
                        [event.data.teamId]: event.data
                    }));
                    break;
                    
                case 'team.updated':
                    setTeams(prev => ({
                        ...prev,
                        [event.data.teamId]: {...prev[event.data.teamId], ...event.data}
                    }));
                    break;
                    
                case 'team.deleted':
                    setTeams(prev => {
                        const newTeams = {...prev};
                        delete newTeams[event.data.teamId];
                        return newTeams;
                    });
                    setTasksByTeam(prev => {
                        const newTasks = {...prev};
                        delete newTasks[event.data.teamId];
                        return newTasks;
                    });
                    break;
            }
        });
    }, [events]);

    return (
        <div>
            <div>Status: {connectionStatus}</div>
            {Object.entries(teams).map(([teamId, team]) => (
                <div key={teamId} className="team-section">
                    <h3>{team.name}</h3>
                    <div className="tasks">
                        {(tasksByTeam[teamId] || []).map(task => (
                            <div key={task.taskId} className="task-item">
                                <input 
                                    type="checkbox" 
                                    checked={task.completed} 
                                    onChange={(e) => updateTaskCompletion(task.taskId, e.target.checked)}
                                />
                                {task.title}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
```

## Event Data Structures

### Task Events (任务事件)

```json
{
  "eventId": "20250101120000-1234",
  "type": "task.created",
  "teamId": 1,
  "actorId": 123,
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "taskId": 456,
    "creatorId": 123,
    "assigneeId": 789,
    "title": "Implement WebSocket support",
    "description": "Add real-time updates via WebSocket",
    "completed": false,
    "priority": "high",
    "due": "2025-01-15"
  }
}
```

### Team Events (团队事件)

```json
{
  "eventId": "20250101120000-5678",
  "type": "team.created",
  "teamId": 1,
  "actorId": 123,
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "teamId": 1,
    "name": "Development Team",
    "description": "Main development team",
    "ownerId": 123
  }
}
```

### Team Member Events (团队成员事件)

```json
{
  "eventId": "20250101120000-9012",
  "type": "team.member_added",
  "teamId": 1,
  "actorId": 123,
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "teamId": 1,
    "userId": 456,
    "role": "member"
  }
}
```

## Testing WebSocket Connection

### Using wscat (CLI tool)

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket (只需要用户ID)
wscat -c "ws://localhost/ws?userId=123"

# You should see real-time events from all teams the user is a member of
```

### Using curl to trigger events

```bash
# Create a task (should trigger task.created event)
curl -X POST http://localhost/api/tasks/teams/1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "title": "Test WebSocket",
    "description": "Testing real-time updates",
    "priority": "medium",
    "due": "2025-01-15"
  }'

# Update a task (should trigger task.updated event)
curl -X PUT http://localhost/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "title": "Updated via WebSocket test",
    "completed": true
  }'

# Add a team member (should trigger team.member_added event)
curl -X POST http://localhost/api/teams/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "userId": 456,
    "role": "member"
  }'
```

## 设计优势

### 🎯 用户中心化设计的优势：

1. **单一连接**: 用户只需要建立一个WebSocket连接，而不是为每个团队建立单独的连接
2. **全面覆盖**: 用户可以接收到所有参与团队的实时更新
3. **简化客户端**: 前端代码更简单，无需管理多个WebSocket连接
4. **更好的用户体验**: 用户在所有团队中的活动都能得到实时反馈
5. **资源效率**: 减少了服务器端的连接管理复杂度

### 📊 事件分发逻辑：

- **任务事件**: 通知团队所有成员 + 任务创建者 + 任务分配者
- **团队事件**: 通知团队所有成员 + 团队所有者
- **团队成员事件**: 通知团队所有成员 + 被影响的用户
- **用户事件**: 只通知用户本人

### 🔄 自动去重机制：

系统会自动去除重复的用户ID，确保每个用户只接收到一份事件副本。

## Error Handling & Connection Recovery

```javascript
function createReconnectingWebSocket(userId, maxRetries = 5) {
    let retryCount = 0;
    let ws;

    function connect() {
        const url = `ws://localhost/ws?userId=${userId}`;
        ws = new WebSocket(url);

        ws.onopen = function() {
            console.log('WebSocket connected for user:', userId);
            retryCount = 0; // Reset retry count on successful connection
        };

        ws.onmessage = function(event) {
            const eventData = JSON.parse(event.data);
            handleRealtimeEvent(eventData);
        };

        ws.onclose = function() {
            console.log('WebSocket disconnected');
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Attempting to reconnect... (${retryCount}/${maxRetries})`);
                setTimeout(connect, 1000 * retryCount); // Exponential backoff
            } else {
                console.error('Max reconnection attempts reached');
            }
        };

        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    }

    connect();
    
    return {
        close: () => ws.close(),
        send: (data) => ws.send(data)
    };
}
```

这个新的用户级别WebSocket实现提供了更强大和灵活的实时更新功能，确保用户能够接收到所有相关的协作更新，而不受团队边界的限制。