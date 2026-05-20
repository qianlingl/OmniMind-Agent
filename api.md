# OmniMind-Agent API 设计文档

## 1. API 概述

OmniMind-Agent 提供 RESTful API 和 WebSocket 接口，支持会话管理、文件操作、搜索、文档解析、记忆管理和任务编排。

**基础 URL**: `/api/v1`

**认证方式**: API Key（Header: `X-API-Key`）

---

## 2. 会话管理 API

### 2.1 创建会话

**Endpoint**: `POST /sessions`

**功能**: 创建新的对话会话

**请求体**:
```json
{
  "user_id": "string (可选，用户标识)",
  "metadata": {
    "context_window": 65536,
    "compression_strategy": "summary"
  }
}
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "created_at": "2026-05-18T10:00:00Z",
  "metadata": {
    "context_window": 65536,
    "compression_strategy": "summary"
  }
}
```

### 2.2 获取会话列表

**Endpoint**: `GET /sessions`

**功能**: 获取用户的所有会话

**响应**:
```json
{
  "sessions": [
    {
      "session_id": "session_abc123",
      "created_at": "2026-05-18T10:00:00Z",
      "last_active": "2026-05-18T11:00:00Z",
      "message_count": 15
    }
  ]
}
```

### 2.3 获取会话详情

**Endpoint**: `GET /sessions/{session_id}`

**功能**: 获取指定会话的详细信息和消息历史

**响应**:
```json
{
  "session_id": "session_abc123",
  "messages": [
    {
      "role": "user",
      "content": "你好",
      "timestamp": "2026-05-18T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "您好！我是 OmniMind-Agent，很高兴为您服务。",
      "timestamp": "2026-05-18T10:00:01Z"
    }
  ]
}
```

### 2.4 发送消息（REST）

**Endpoint**: `POST /sessions/{session_id}/messages`

**功能**: 发送消息到会话

**请求体**:
```json
{
  "content": "string (消息内容)",
  "files": ["file_id_1", "file_id_2"],
  "enable_search": true,
  "use_memory": true
}
```

**响应**:
```json
{
  "message_id": "msg_xyz789",
  "role": "assistant",
  "content": "这是助手的回复...",
  "timestamp": "2026-05-18T10:01:00Z",
  "sources": [
    {"type": "memory", "id": "mem_123"},
    {"type": "search", "query": "搜索关键词"}
  ]
}
```

### 2.5 发送消息（WebSocket）

**Endpoint**: `WS /ws/sessions/{session_id}`

**功能**: 实时消息通信

**消息格式**:
```json
{
  "type": "message",
  "content": "用户消息",
  "files": [],
  "enable_search": true,
  "use_memory": true
}
```

**响应格式**:
```json
{
  "type": "message",
  "message_id": "msg_xyz789",
  "role": "assistant",
  "content": "响应内容",
  "timestamp": "2026-05-18T10:01:00Z"
}
```

### 2.6 删除会话

**Endpoint**: `DELETE /sessions/{session_id}`

**功能**: 删除指定会话

**响应**:
```json
{
  "success": true,
  "message": "会话已删除"
}
```

---

## 3. 文件操作 API

### 3.1 上传文件

**Endpoint**: `POST /files/upload`

**功能**: 上传文件

**请求体**: `multipart/form-data`

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| file | File | 文件内容 |
| session_id | string | 关联会话（可选） |

**响应**:
```json
{
  "file_id": "file_abc123",
  "filename": "document.pdf",
  "size": 102400,
  "type": "pdf",
  "uploaded_at": "2026-05-18T10:00:00Z"
}
```

### 3.2 读取文件

**Endpoint**: `GET /files/{file_id}/content`

**功能**: 获取文件内容

**响应**:
```json
{
  "file_id": "file_abc123",
  "content": "文件内容文本...",
  "encoding": "utf-8"
}
```

### 3.3 写入文件

**Endpoint**: `PUT /files/{file_id}/content`

**功能**: 写入文件内容

**请求体**:
```json
{
  "content": "新文件内容",
  "append": false
}
```

**响应**:
```json
{
  "success": true,
  "file_id": "file_abc123",
  "size": 1024
}
```

### 3.4 删除文件

**Endpoint**: `DELETE /files/{file_id}`

**功能**: 删除文件

**响应**:
```json
{
  "success": true,
  "message": "文件已删除"
}
```

### 3.5 批量重命名

**Endpoint**: `POST /files/batch/rename`

**功能**: 批量重命名文件

**请求体**:
```json
{
  "files": [
    {"old_name": "file1.txt", "new_name": "file1_v2.txt"},
    {"old_name": "file2.txt", "new_name": "file2_v2.txt"}
  ],
  "directory": "/workspace"
}
```

**响应**:
```json
{
  "success": true,
  "renamed_count": 2,
  "errors": []
}
```

### 3.6 列出目录

**Endpoint**: `GET /files/list`

**功能**: 列出目录内容

**请求参数**:
| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| path | string | 目录路径，默认 `/` |
| recursive | boolean | 是否递归列出 |

**响应**:
```json
{
  "path": "/workspace",
  "files": [
    {"name": "file1.txt", "type": "file", "size": 1024},
    {"name": "subdir", "type": "directory"}
  ]
}
```

---

## 4. 搜索 API

### 4.1 执行搜索

**Endpoint**: `POST /search`

**功能**: 执行联网搜索

**请求体**:
```json
{
  "query": "人工智能最新进展 2026",
  "engine": "bing",
  "max_results": 10
}
```

**响应**:
```json
{
  "query": "人工智能最新进展 2026",
  "results": [
    {
      "title": "AI 2026 年度报告",
      "url": "https://example.com/report",
      "summary": "报告摘要...",
      "published_at": "2026-05-01"
    }
  ],
  "total_results": 100
}
```

### 4.2 智能搜索触发

**Endpoint**: `POST /search/auto`

**功能**: 自动判断是否需要搜索并执行

**请求体**:
```json
{
  "query": "今天的天气怎么样？",
  "session_id": "session_abc123"
}
```

**响应**:
```json
{
  "triggered": true,
  "query": "今天的天气怎么样？",
  "results": [...]
}
```

---

## 5. 文档解析 API

### 5.1 解析文档

**Endpoint**: `POST /documents/parse`

**功能**: 解析上传的文档

**请求体**:
```json
{
  "file_id": "file_abc123",
  "options": {
    "extract_tables": true,
    "extract_images": false
  }
}
```

**响应**:
```json
{
  "file_id": "file_abc123",
  "content": "解析后的文本内容...",
  "tables": [
    {
      "header": ["列1", "列2"],
      "rows": [["数据1", "数据2"]]
    }
  ],
  "metadata": {
    "pages": 10,
    "word_count": 1500
  }
}
```

### 5.2 解析网页

**Endpoint**: `POST /documents/parse-url`

**功能**: 解析网页内容

**请求体**:
```json
{
  "url": "https://example.com/article",
  "extract_images": false
}
```

**响应**:
```json
{
  "url": "https://example.com/article",
  "title": "文章标题",
  "content": "网页正文内容...",
  "metadata": {
    "author": "作者",
    "published_at": "2026-05-01"
  }
}
```

---

## 6. 记忆管理 API

### 6.1 存储记忆

**Endpoint**: `POST /memory`

**功能**: 存储记忆片段

**请求体**:
```json
{
  "type": "fact",
  "content": "用户喜欢 Python 编程",
  "session_id": "session_abc123",
  "tags": ["preference", "user"]
}
```

**响应**:
```json
{
  "memory_id": "mem_xyz789",
  "type": "fact",
  "content": "用户喜欢 Python 编程",
  "created_at": "2026-05-18T10:00:00Z"
}
```

### 6.2 查询记忆

**Endpoint**: `GET /memory/search`

**功能**: 搜索记忆

**请求参数**:
| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| query | string | 搜索关键词 |
| type | string | 记忆类型（可选） |
| limit | int | 返回数量（默认 10） |

**响应**:
```json
{
  "results": [
    {
      "memory_id": "mem_xyz789",
      "type": "fact",
      "content": "用户喜欢 Python 编程",
      "similarity": 0.95
    }
  ]
}
```

### 6.3 获取记忆详情

**Endpoint**: `GET /memory/{memory_id}`

**功能**: 获取记忆详情

**响应**:
```json
{
  "memory_id": "mem_xyz789",
  "type": "fact",
  "content": "用户喜欢 Python 编程",
  "tags": ["preference", "user"],
  "created_at": "2026-05-18T10:00:00Z",
  "last_accessed": "2026-05-18T11:00:00Z"
}
```

### 6.4 删除记忆

**Endpoint**: `DELETE /memory/{memory_id}`

**功能**: 删除记忆

**响应**:
```json
{
  "success": true,
  "message": "记忆已删除"
}
```

---

## 7. 任务编排 API

### 7.1 创建任务

**Endpoint**: `POST /tasks`

**功能**: 创建复杂任务，由多 Agent 协作完成

**请求体**:
```json
{
  "session_id": "session_abc123",
  "type": "code_development",
  "description": "开发一个 Todo 应用的后端 API",
  "requirements": [
    "使用 FastAPI",
    "支持 CRUD 操作",
    "使用 SQLite 数据库"
  ],
  "priority": "high"
}
```

**响应**:
```json
{
  "task_id": "task_abc123",
  "status": "pending",
  "created_at": "2026-05-18T10:00:00Z"
}
```

### 7.2 获取任务状态

**Endpoint**: `GET /tasks/{task_id}`

**功能**: 获取任务执行状态

**响应**:
```json
{
  "task_id": "task_abc123",
  "status": "in_progress",
  "progress": 50,
  "sub_tasks": [
    {"name": "代码编写", "status": "completed"},
    {"name": "测试用例", "status": "in_progress"},
    {"name": "文档编写", "status": "pending"}
  ],
  "results": {
    "code": "...",
    "tests": "...",
    "docs": "..."
  }
}
```

### 7.3 取消任务

**Endpoint**: `POST /tasks/{task_id}/cancel`

**功能**: 取消正在执行的任务

**响应**:
```json
{
  "success": true,
  "message": "任务已取消"
}
```

---

## 8. 学习助手 API

### 8.1 创建学习目标

**Endpoint**: `POST /learning/goals`

**功能**: 设定学习目标，系统自动分解为计划

**请求体**:
```json
{
  "title": "三个月学会基础 Python",
  "subject": "programming",
  "topic": "Python",
  "level": "beginner",
  "daily_minutes": 60,
  "duration_weeks": 12,
  "available_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "notes": "想用于数据分析自动化"
}
```

**响应**:
```json
{
  "goal_id": "goal_abc123",
  "title": "三个月学会基础 Python",
  "status": "active",
  "plan": {
    "milestones": [
      {
        "week": 1,
        "title": "Python 基础语法",
        "topic": "变量、数据类型、运算符",
        "tasks": [
          {"day": 1, "title": "变量与赋值", "duration_min": 30, "type": "reading"},
          {"day": 1, "title": "数据类型练习", "duration_min": 30, "type": "practice"}
        ]
      }
    ],
    "total_tasks": 84,
    "estimated_completion": "2026-08-11"
  },
  "created_at": "2026-05-19T10:00:00Z"
}
```

### 8.2 获取学习目标列表

**Endpoint**: `GET /learning/goals`

**功能**: 获取用户所有学习目标

**响应**:
```json
{
  "goals": [
    {
      "goal_id": "goal_abc123",
      "title": "三个月学会基础 Python",
      "status": "active",
      "progress_pct": 15,
      "streak_days": 7,
      "created_at": "2026-05-19T10:00:00Z"
    }
  ]
}
```

### 8.3 获取学习目标详情

**Endpoint**: `GET /learning/goals/{goal_id}`

**功能**: 获取学习目标完整详情，包含任务树和进度

**响应**:
```json
{
  "goal_id": "goal_abc123",
  "title": "三个月学会基础 Python",
  "status": "active",
  "progress_pct": 15,
  "current_week": 2,
  "current_milestone": {
    "week": 2,
    "title": "条件判断与循环",
    "tasks": [
      {"task_id": "task_001", "title": "if/else 语句", "duration_min": 30, "status": "completed"},
      {"task_id": "task_002", "title": "for 循环入门", "duration_min": 30, "status": "in_progress"}
    ]
  },
  "streak_days": 7,
  "total_study_minutes": 540
}
```

### 8.4 获取今日任务

**Endpoint**: `GET /learning/goals/{goal_id}/tasks/today`

**功能**: 获取当前日期的学习任务

**响应**:
```json
{
  "date": "2026-05-19",
  "tasks": [
    {
      "task_id": "task_002",
      "title": "for 循环入门 — 阅读教程并完成 3 道练习",
      "type": "practice",
      "duration_min": 45,
      "status": "pending",
      "order": 1
    },
    {
      "task_id": "task_003",
      "title": "复习：变量与数据类型",
      "type": "review",
      "duration_min": 15,
      "status": "pending",
      "order": 2
    }
  ],
  "total_minutes": 60
}
```

### 8.5 更新任务状态

**Endpoint**: `PATCH /learning/tasks/{task_id}`

**功能**: 标记任务完成/跳过

**请求体**:
```json
{
  "status": "completed",
  "actual_duration_min": 50
}
```

**响应**:
```json
{
  "task_id": "task_002",
  "status": "completed",
  "goal_progress_pct": 17,
  "xp_earned": 50
}
```

### 8.6 发起对话式测验

**Endpoint**: `POST /learning/goals/{goal_id}/quiz/start`

**功能**: 根据当前学习进度生成测验问题

**请求体**:
```json
{
  "topic": "Python 循环",
  "question_count": 3
}
```

**响应**:
```json
{
  "quiz_id": "quiz_abc123",
  "questions": [
    {
      "question_id": "q_001",
      "type": "open_ended",
      "content": "用自己的话解释什么是 for 循环，并举一个实际例子",
      "expected_concepts": ["迭代", "可迭代对象", "循环变量"]
    }
  ]
}
```

### 8.7 提交测验回答

**Endpoint**: `POST /learning/quiz/{quiz_id}/answer`

**功能**: 提交单题回答，获取评估反馈

**请求体**:
```json
{
  "question_id": "q_001",
  "answer": "for 循环就是遍历一个列表里面的每个元素，对每个元素做同样的操作。比如遍历学生名单，打印每个人的名字。"
}
```

**响应**:
```json
{
  "question_id": "q_001",
  "score": 4,
  "max_score": 5,
  "feedback": "理解基本正确！补充几点：1) for 循环不仅限于列表，还可遍历字符串、元组、字典等可迭代对象；2) 循环变量的作用域需要注意。",
  "missing_concepts": ["可迭代对象的概念", "遍历字典"],
  "weak_points": [
    {"concept": "可迭代对象", "mastery": 0.3}
  ],
  "next_review_at": "2026-05-20T10:00:00Z"
}
```

### 8.8 获取待复习列表

**Endpoint**: `GET /learning/goals/{goal_id}/reviews`

**功能**: 获取当前需要复习的概念列表（基于间隔重复调度）

**响应**:
```json
{
  "due_reviews": [
    {
      "review_id": "rev_001",
      "concept": "可变对象 vs 不可变对象",
      "mastery": 0.4,
      "last_reviewed": "2026-05-18T10:00:00Z",
      "interval_days": 1,
      "status": "overdue"
    },
    {
      "review_id": "rev_002",
      "concept": "列表推导式",
      "mastery": 0.6,
      "last_reviewed": "2026-05-16T10:00:00Z",
      "interval_days": 3,
      "status": "due_today"
    }
  ],
  "total_due": 5
}
```

### 8.9 提交复习反馈

**Endpoint**: `POST /learning/reviews/{review_id}/feedback`

**功能**: 用户在闪卡复习后自评掌握度，更新间隔重复调度

**请求体**:
```json
{
  "quality": 4,
  "response_time_ms": 3500
}
```

**响应**:
```json
{
  "review_id": "rev_001",
  "concept": "可变对象 vs 不可变对象",
  "new_interval_days": 3,
  "next_review_at": "2026-05-22T10:00:00Z",
  "easiness": 2.6
}
```

### 8.10 上传笔记生成闪卡

**Endpoint**: `POST /learning/goals/{goal_id}/flashcards/generate`

**功能**: 上传笔记/摘录，AI 提取知识点生成闪卡

**请求体**: `multipart/form-data`

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| file | File | 笔记文件（PDF/TXT/图片） |
| text | string | 直接粘贴的笔记文本（与 file 二选一） |
| flashcard_count | int | 期望生成的闪卡数量（默认 10） |

**响应**:
```json
{
  "batch_id": "fc_batch_001",
  "source": "Python 学习笔记 Chapter 3",
  "flashcards": [
    {
      "flashcard_id": "fc_001",
      "front": "什么是 Python 中的可变对象？举例说明",
      "back": "可变对象是创建后可以修改其内容的对象。例如：list、dict、set。操作后内存地址不变。",
      "tags": ["Python", "数据类型"],
      "concept": "可变对象"
    },
    {
      "flashcard_id": "fc_002",
      "front": "列表和元组的主要区别是什么？",
      "back": "1) 列表可变，元组不可变；2) 列表用[]，元组用()；3) 列表有更多内置方法；4) 元组可作为字典的键",
      "tags": ["Python", "数据结构"],
      "concept": "列表 vs 元组"
    }
  ],
  "generated_count": 10,
  "created_at": "2026-05-19T10:05:00Z"
}
```

### 8.11 获取闪卡列表

**Endpoint**: `GET /learning/goals/{goal_id}/flashcards`

**功能**: 获取学习目标关联的所有闪卡

**请求参数**:
| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| status | string | 筛选：all / due / mastered |
| tag | string | 按标签筛选 |
| limit | int | 每页数量 |

**响应**:
```json
{
  "flashcards": [
    {
      "flashcard_id": "fc_001",
      "front": "什么是 Python 中的可变对象？举例说明",
      "back": "可变对象是创建后可以修改其内容的对象。例如：list、dict、set。操作后内存地址不变。",
      "mastery": 0.4,
      "reviews_count": 3,
      "next_review_at": "2026-05-20T10:00:00Z",
      "tags": ["Python", "数据类型"]
    }
  ],
  "total": 25
}
```

### 8.12 生成思维导图

**Endpoint**: `POST /learning/goals/{goal_id}/mindmap/generate`

**功能**: 根据学习内容/笔记生成知识结构思维导图

**请求体**:
```json
{
  "source_type": "goal_topics",
  "scope": "current_week",
  "include_mastery": true
}
```

**响应**:
```json
{
  "mindmap_id": "mm_abc123",
  "title": "Python 基础 — 第 2 周知识结构",
  "format": "mermaid",
  "content": "mindmap\n  root((Python 基础))\n    变量与数据类型\n      数字\n      字符串\n      布尔值\n    条件判断\n      if/elif/else\n      比较运算符\n      逻辑运算符\n    循环\n      for 循环\n        遍历列表\n        遍历字典\n      while 循环\n        break\n        continue",
  "node_count": 15,
  "generated_at": "2026-05-19T10:00:00Z"
}
```

### 8.13 获取学习报告

**Endpoint**: `GET /learning/goals/{goal_id}/report`

**功能**: 获取学习统计报告

**请求参数**:
| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| period | string | week / month / all |

**响应**:
```json
{
  "goal_id": "goal_abc123",
  "period": "week",
  "stats": {
    "tasks_completed": 12,
    "tasks_total": 14,
    "study_minutes": 540,
    "quiz_avg_score": 4.2,
    "reviews_completed": 8,
    "new_concepts_learned": 15,
    "streak_days": 7,
    "mastery_overall": 0.65
  },
  "mastery_by_topic": [
    {"topic": "变量与数据类型", "mastery": 0.85},
    {"topic": "条件判断", "mastery": 0.70},
    {"topic": "循环", "mastery": 0.40}
  ],
  "weak_points": ["循环嵌套", "可变 vs 不可变对象"],
  "study_calendar": [
    {"date": "2026-05-13", "minutes": 60, "tasks": 2},
    {"date": "2026-05-14", "minutes": 55, "tasks": 2}
  ]
}
```

---

## 9. 关键伪代码

### 9.1 对话压缩逻辑

```python
def compress_context(messages: List[Message], max_tokens: int = 65536) -> List[Message]:
    """
    对话压缩算法：保留关键信息，生成摘要
    """
    total_tokens = sum(msg.token_count for msg in messages)
    
    if total_tokens <= max_tokens:
        return messages
    
    # 计算需要压缩的比例
    compression_ratio = max_tokens / total_tokens
    
    # 保留最近的消息
    recent_messages = messages[-int(len(messages) * 0.3)]
    
    # 对历史消息生成摘要
    historical_messages = messages[:-int(len(messages) * 0.3)]
    summary = generate_summary(historical_messages)
    
    return [Message(role="system", content=summary)] + recent_messages
```

### 9.2 智能搜索触发

```python
def should_trigger_search(message: str) -> bool:
    """
    判断是否需要触发搜索
    """
    search_triggers = [
        "最新", "今天", "现在", "最近",
        "新闻", "资讯", "报道",
        "天气", "股价", "汇率",
        "怎么样", "如何", "什么是"
    ]
    
    for trigger in search_triggers:
        if trigger in message:
            return True
    
    # 检查是否为事实性问题
    if is_factual_question(message):
        return True
    
    return False
```

### 9.3 多 Agent 任务调度

```python
class TaskOrchestrator:
    def __init__(self):
        self.agents = {
            "code": CodeAgent(),
            "test": TestAgent(),
            "doc": DocAgent()
        }
    
    def execute_task(self, task: Task) -> TaskResult:
        """
        执行复杂任务，协调多个 Agent
        """
        # 任务分解
        subtasks = self.decompose_task(task)
        
        results = {}
        
        for subtask in subtasks:
            agent = self.agents.get(subtask.type)
            if agent:
                results[subtask.type] = agent.execute(subtask)
        
        # 汇总结果
        return self.summarize_results(results)
```

### 9.4 长期记忆检索

```python
def retrieve_memory(query: str, top_k: int = 5) -> List[Memory]:
    """
    从长期记忆中检索相关信息
    """
    # 向量检索
    vector_results = vector_db.search(query, top_k)
    
    # 关系数据库查询
    relational_results = pg_db.query(query)
    
    # 合并结果，去重排序
    all_results = merge_and_rank(vector_results + relational_results)
    
    return all_results[:top_k]
```

### 9.5 学习目标分解

```python
class GoalDecomposer:
    def __init__(self, llm_client):
        self.llm = llm_client
    
    def decompose(self, goal: LearningGoal, user_profile: UserProfile) -> LearningPlan:
        """
        将学习目标分解为周里程碑和日任务
        """
        # 评估用户当前水平
        baseline = self.assess_baseline(goal.topic, user_profile)
        
        # 构建领域知识图谱，确定学习路径
        knowledge_graph = self.build_knowledge_graph(goal.topic, baseline)
        
        # 按时间约束切分
        total_minutes = goal.duration_weeks * goal.days_per_week * goal.daily_minutes
        milestones = self.partition_by_week(knowledge_graph, goal.duration_weeks)
        
        # 生成每日任务
        daily_tasks = []
        for week_idx, milestone in enumerate(milestones):
            week_tasks = self.allocate_daily_tasks(
                milestone, 
                goal.days_per_week, 
                goal.daily_minutes,
                user_profile.preferred_learning_style
            )
            daily_tasks.extend(week_tasks)
        
        return LearningPlan(
            goal_id=goal.id,
            milestones=milestones,
            daily_tasks=daily_tasks,
            estimated_completion=goal.start_date + timedelta(weeks=goal.duration_weeks)
        )
```

### 9.6 间隔重复调度 (SM-2 改进版)

```python
class SpacedRepetitionEngine:
    def __init__(self):
        # SM-2 算法参数
        self.default_easiness = 2.5
        self.min_easiness = 1.3
        self.default_interval = 1  # 天
    
    def calculate_next_review(self, item: ReviewItem, quality: int) -> ReviewSchedule:
        """
        根据回答质量计算下次复习时间
        
        quality: 0-5 评分
          5: 完美回答，毫不迟疑
          4: 正确回答，稍有犹豫
          3: 基本正确，有困难但最终答对
          2: 错误，但看到答案后觉得熟悉
          1: 完全错误
          0: 完全没印象
        """
        # 更新 easiness 因子
        item.easiness = max(
            self.min_easiness,
            item.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        )
        
        if quality < 3:
            # 回答不理想，重置间隔
            item.repetitions = 0
            item.interval = 1
        else:
            item.repetitions += 1
            if item.repetitions == 1:
                item.interval = 1
            elif item.repetitions == 2:
                item.interval = 3
            else:
                item.interval = round(item.interval * item.easiness)
        
        # 添加遗忘曲线微调（Ebbinghaus 修正因子）
        item.interval = self._apply_forgetting_curve(item)
        
        next_review = datetime.now() + timedelta(days=item.interval)
        return ReviewSchedule(item_id=item.id, next_review=next_review, interval=item.interval)
    
    def _apply_forgetting_curve(self, item: ReviewItem) -> int:
        """
        Ebbinghaus 遗忘曲线修正：
        20分钟后记忆保留 58%，1小时后 44%，1天后 26%
        在遗忘临界点（记忆保留率 ~30%）前安排复习
        """
        mastery = getattr(item, 'mastery', 0.5)
        if mastery < 0.3:
            # 掌握度低，缩短间隔
            return max(1, int(item.interval * 0.5))
        elif mastery > 0.8:
            # 掌握度高，可适当延长
            return int(item.interval * 1.2)
        return item.interval
```

### 9.7 对话式测验评估

```python
class QuizEngine:
    def __init__(self, llm_client):
        self.llm = llm_client
    
    def generate_question(self, topic: str, difficulty: str, learned_concepts: List[str]) -> Question:
        """根据主题和已学概念生成开放性问题"""
        prompt = f"""
        基于以下信息生成一个{difficulty}难度的开放性问题：
        主题：{topic}
        已学概念：{', '.join(learned_concepts)}
        
        问题要求：
        - 考察理解而非记忆
        - 引导用户举例说明
        - 避免是非题
        
        同时列出期望用户提及的关键概念列表。
        """
        response = self.llm.generate(prompt)
        return self._parse_question(response)
    
    def evaluate_answer(self, question: Question, answer: str) -> QuizFeedback:
        """评估用户回答质量"""
        prompt = f"""
        问题：{question.content}
        期望关键概念：{', '.join(question.expected_concepts)}
        用户回答：{answer}
        
        请评估：
        1. 正确性评分 (0-5)
        2. 用户遗漏的关键概念列表
        3. 针对性反馈（鼓励性+补充说明，200字以内）
        """
        response = self.llm.generate(prompt)
        return self._parse_evaluation(response)
    
    def identify_weak_points(self, feedback: QuizFeedback) -> List[WeakPoint]:
        """从测验反馈中提取薄弱知识点，写入记忆模块"""
        weak_points = []
        for concept in feedback.missing_concepts:
            weak_points.append(WeakPoint(
                concept=concept,
                detected_at=datetime.now(),
                source="quiz"
            ))
        return weak_points
```

### 9.8 闪卡与思维导图生成

```python
class ContentGenerator:
    def __init__(self, llm_client, doc_parser):
        self.llm = llm_client
        self.doc_parser = doc_parser
    
    def generate_flashcards(self, content: str, count: int = 10) -> List[Flashcard]:
        """从笔记内容提取关键知识点生成 Q&A 闪卡"""
        prompt = f"""
        从以下学习笔记中提取 {count} 个核心知识点，为每个知识点生成一张闪卡。
        
        笔记内容：
        {content}
        
        格式要求：
        - front: 以疑问句形式呈现的问题
        - back: 简洁准确的解答（3-5句）
        - concept: 对应的知识概念名称
        - tags: 2-3个标签
        
        确保覆盖最重要的概念，避免生成过于细碎的问题。
        """
        response = self.llm.generate(prompt)
        return self._parse_flashcards(response)
    
    def generate_mindmap(self, flashcards: List[Flashcard], title: str) -> MindMap:
        """将闪卡知识点组织为思维导图结构"""
        # 按 tags 聚类知识点
        clusters = self._cluster_by_tags(flashcards)
        
        # 构建层级树结构
        tree = {"title": title, "children": []}
        for cluster_name, items in clusters.items():
            node = {"title": cluster_name, "children": []}
            for item in items:
                node["children"].append({
                    "title": item.concept,
                    "mastery": item.mastery if hasattr(item, 'mastery') else None
                })
            tree["children"].append(node)
        
        # 生成 Mermaid mindmap 语法
        mermaid_syntax = self._render_mermaid_mindmap(tree)
        return MindMap(title=title, format="mermaid", content=mermaid_syntax)
    
    def _render_mermaid_mindmap(self, tree: dict) -> str:
        """递归渲染 Mermaid mindmap"""
        lines = [f"mindmap\n  root(({tree['title']}))"]
        for child in tree.get("children", []):
            lines.append(f"    {child['title']}")
            for grandchild in child.get("children", []):
                mastery_note = f" [{grandchild['mastery']*100:.0f}%]" if grandchild.get('mastery') else ""
                lines.append(f"      {grandchild['title']}{mastery_note}")
        return "\n".join(lines)
```

---

**文档版本**: v1.1  
**创建日期**: 2026-05-18  
**最后更新**: 2026-05-19  
**状态**: 草案