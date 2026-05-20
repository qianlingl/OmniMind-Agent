# AI Agent API 设计文档 (api.md)

## 1. 概述
所有 API 基于 RESTful 风格，使用 JSON 格式。实时对话通过 WebSocket 实现。认证方式：Bearer Token。

**基础URL**: `https://api.omnimind.ai/v1`

## 2. 会话与对话 API
### 2.1 创建会话（包含长时记忆上下文）
`POST /sessions`
- **Request Body**:
  ```json
  {
    "user_id": "u123",
    "memory_scope": ["general", "coding_prefs"]
  }
  ```
### 2.2 发送消息到会话 (WebSocket)
`ws://.../sessions/{session_id}/chat`
 - **输入消息:**
  ```json
  {
    "type": "user_message",
    "content": "帮我找一下关于GPT-5的最新新闻，并总结要点。",
    "options": {
      "enable_search": true,
      "search_sources": ["bing", "searchapi"],
      "attach_context": "previous_10_messages"
    }
  }
  ```
  - **流式回复:**
  ```json
  {"type": "thinking", "action": "searching", "query": "GPT-5 latest news 2026"}
  {"type": "text_delta", "content": "根据搜索结果，GPT-5..."}
  {"type": "citation", "index": 1, "url": "...", "title": "..."}
  {"type": "message_end", "sources": [...]}
  ```
## 3. 文件操作 API
### 3.1 列出目录
`GET /files/{user_id}/{path}?action=list`
- **Response**:
  ```json
  {
    "entries": [
      {"name": "downloads", "type": "dir", "modified": "..."},
      {"name": "readme.txt", "type": "file", "size": 2048}
    ]
  }
  ```

### 3.2 执行文件操作（批量）
`POST /files/operate`
- **Request Body**:
  ```json
  {
    "user_id": "u123",
    "operations": [
      {"action": "rename", "source": "downloads/IMG_001.jpg", "target": "photos/vacation_001.jpg"},
      {"action": "delete", "target": "temp/old.doc"},
      {"action": "create_dir", "target": "sorted/by_month"}
    ]
  }
  ```
- **Response**: 操作结果数组，每个含状态与可能的错误信息。

## 4. 联网搜索 API
### 4.1 执行搜索（通常内部调用，也可独立）
`POST /search`
- **Request**:
  ```json
  {
    "query": "transformer architecture 2026",
    "engines": ["bing", "google"],
    "num_results": 10,
    "safe_search": true
  }
  ```
- **Response**:
  ```json
  {
    "results": [
      {
        "title": "...",
        "url": "...",
        "snippet": "...",
        "engine": "bing",
        "cached": false
      }
    ],
    "query_id": "sr_xyz"
  }
  ```

## 5. 文档/链接阅读 API
### 5.1 上传文档并创建索引
`POST /documents/upload`
- **Form-data**: `file`, `user_id`
- **Response**:
  ```json
  {
    "doc_id": "doc_abc",
    "file_type": "pdf",
    "pages": 12,
    "extracted_text_preview": "..."
  }
  ```

### 5.2 提交 URL 解析
`POST /documents/parse_url`
- **Request**:
  ```json
  {
    "url": "https://example.com/article",
    "user_id": "u123"
  }
  ```

### 5.3 基于文档的问答
`POST /documents/{doc_id}/ask`
- **Request**:
  ```json
  {
    "question": "这篇论文的主要贡献是什么？"
  }
  ```

## 6. 长时记忆管理 API
### 6.1 查询记忆
`GET /memories/{user_id}?query=编码风格`
### 6.2 存储记忆
`POST /memories`
```json
{
  "user_id": "u123",
  "content": "用户偏好：用Python写Web接口，避免用Java",
  "category": "coding_prefs",
  "importance": 8
}
```
### 6.3 删除记忆
`DELETE /memories/{memory_id}`

## 7. 多Agent协作 API
### 7.1 创建协作任务
`POST /orchestrator/task`
- **Request**:
  ```json
  {
    "user_id": "u123",
    "task_description": "开发一个计算器Web应用，包括代码、测试和README",
    "delegation_strategy": "auto",
    "agents": ["coding_agent", "testing_agent", "writing_agent"]
  }
  ```
- **Response**:
  ```json
  {
    "task_id": "task_007",
    "sub_tasks": [
      {"agent": "coding_agent", "status": "queued"},
      {"agent": "testing_agent", "status": "queued"},
      {"agent": "writing_agent", "status": "queued"}
    ]
  }
  ```
### 7.2 查看任务进度
`GET /orchestrator/task/{task_id}`
```