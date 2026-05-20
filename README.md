# OmniMind-Agent

全栈 AI 多功能助手，支持智能对话、文件管理、网络搜索、多 Agent 任务编排、超个性化学习助手。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI (Python 3.11+) |
| 数据库 | SQLite (aiosqlite) + ChromaDB |
| 向量存储 | ChromaDB (本地嵌入式) |
| LLM | OpenAI 兼容接口 (DeepSeek) |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |

## 功能模块

- **FR-01 智能对话** — 流式聊天、上下文压缩、WebSocket 实时通信
- **FR-02 文件管理** — 上传/下载/编辑/删除，沙箱路径保护
- **FR-03 网络搜索** — Bing / SearchAPI 搜索引擎，自动触发搜索
- **FR-04 文档解析** — PDF / DOCX / XLSX / HTML / Markdown 多格式解析
- **FR-05 记忆系统** — 事实提取 + 向量检索（ChromaDB），对话自动记忆
- **FR-06 多 Agent 编排** — LLM 分解任务，Code/Test/Doc Agent 并行执行
- **FR-07 学习助手** — 目标分解、每日任务、测验、SM-2 间隔重复、闪卡/思维导图

## 项目结构

```
1b/
├── backend/                  # FastAPI 后端
│   ├── main.py               # 应用入口
│   ├── config.py              # 配置管理 (Pydantic Settings)
│   ├── database.py            # SQLAlchemy 异步引擎
│   ├── dependencies.py        # API Key 鉴权 / DB 依赖注入
│   ├── routers/               # API 路由 (8 个模块)
│   ├── services/              # 业务逻辑层 (11 个服务)
│   ├── models/                # SQLAlchemy ORM 模型 (13 张表)
│   ├── schemas/               # Pydantic 请求/响应模型
│   ├── repositories/          # 数据访问层 (6 个 repo)
│   ├── core/                  # 异常处理 / 上下文压缩
│   ├── vector_store/          # ChromaDB 封装
│   └── tests/                 # pytest 测试 (21 个用例)
├── frontend/                 # React + TypeScript 前端
│   └── src/
│       ├── api/               # API 客户端模块 (8 个)
│       ├── components/        # UI 组件 (17 个)
│       ├── pages/             # 页面 (6 个)
│       ├── contexts/          # React Context (Auth)
│       ├── hooks/             # 自定义 Hooks (useChat)
│       └── types/             # TypeScript 类型定义
├── agent/                    # Python 虚拟环境 (Python 3.11.8)
└── data/                     # 运行时数据 (SQLite + ChromaDB + workspace)
```

## 快速开始

### 1. 环境准备

- Python 3.11+
- Node.js 18+
- 虚拟环境位于 `agent/` 目录，已安装所有依赖

### 2. 配置 LLM API

编辑 `backend/.env`，填写你的 API Key：

```env
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=你的APIKey
LLM_MODEL=deepseek-chat
```

> 开发模式下 `API_KEY_HASH` 已注释，无需配置前端 API Key。

### 3. 启动后端

```bash
cd backend

# Windows PowerShell (激活虚拟环境)
../agent/Scripts/activate

# 启动服务 (端口 8000，热重载)
uvicorn main:app --reload --port 8000
```

访问 http://localhost:8000/docs 查看 Swagger API 文档。

### 4. 启动前端

```bash
cd frontend

# 安装依赖 (首次)
npm install

# 启动开发服务器 (端口 3000)
npm run dev
```

访问 http://localhost:3000，前端请求自动代理到后端 8000 端口。

## 运行测试

```bash
cd backend
../agent/Scripts/activate
pytest tests/ -v
```

## 当前项目状态

### 已完成功能清单

| 模块 | 功能 | 状态 |
|------|------|------|
| 对话 | 多轮对话（WebSocket + REST） | ✅ |
| 对话 | 上下文压缩（64k token） | ✅ |
| 对话 | 自动记忆提取 | ✅ |
| 文件 | 上传/下载/写入/删除 | ✅ |
| 文件 | 批量重命名 | ✅ |
| 文件 | 目录导航/文件删除 | ✅ |
| 搜索 | Bing / SearchAPI 集成 | ✅ |
| 搜索 | 智能触发关键词 | ✅ |
| 文档 | PDF / DOCX / XLSX / HTML 解析 | ✅ |
| 记忆 | 混合存储（向量+关系） | ✅ |
| 记忆 | 跨会话调用 | ✅ |
| 任务编排 | 多 Agent 协作（提示词路由） | ✅ |
| 学习 | 目标分解（LLM 生成计划） | ✅ |
| 学习 | 每日任务推送 | ✅ |
| 学习 | 对话式测验 | ✅ |
| 学习 | SM-2 间隔重复 | ✅ |
| 学习 | 闪卡生成与复习 | ✅ |
| 学习 | 思维导图生成（Mermaid） | ✅ |
| 学习 | 学习报告 | ✅ |

### 已知限制

- 上下文 token 计数使用字符/4 估算，非精确 tiktoken 计数
- 多 Agent 为提示词路由方式，无实际代码执行沙箱
- 搜索 API Key 未配置时，搜索功能不可用
- 浅色主题尚未实现（UI 预留但未激活）

### 已修复问题（v1.1.1）

- Flashcard 复习反馈 API 路由修正
- LearningPage 无限 re-fetch 问题
- GoalWizard 错误处理
- Mermaid 思维导图可视化
- 文件管理器目录导航与删除
- 后端 Schema 添加枚举和边界验证
- 数据库添加索引和唯一约束
- 所有后端服务添加错误日志
- Orchestrator 单 Agent 失败不中断整体流程

```bash
cd backend
../agent/Scripts/activate
pytest tests/ -v
```

## API 端点一览

| 模块 | 端点 |
|------|------|
| Sessions | `POST/GET /sessions`, `POST /sessions/{id}/messages`, `WS /ws/sessions/{id}` |
| Files | `POST /files/upload`, `GET /files/list`, `GET/PUT/DELETE /files/{id}` |
| Search | `POST /search`, `POST /search/auto` |
| Documents | `POST /documents/parse`, `POST /documents/url` |
| Memory | `POST /memory`, `GET /memory/search`, `GET/DELETE /memory/{id}` |
| Tasks | `POST /tasks`, `GET /tasks/{id}`, `POST /tasks/{id}/cancel` |
| Learning | 13 个端点 — Goals, Tasks, Quiz, Reviews, Flashcards, MindMap, Report |
