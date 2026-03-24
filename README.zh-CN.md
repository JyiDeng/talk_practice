# Scholavo（学述）

面向研究者与工程师的 AI 口语训练平台。

EN: Scholavo is an AI-powered speaking practice platform that helps researchers and engineers improve structured technical communication through daily drills, real-time coaching, and actionable analysis.

中文：Scholavo（学述）是一个 AI 驱动的口语训练平台，通过每日任务、实时对练与可执行分析，帮助研究者和工程师提升结构化技术表达能力。

Language: [English](README.md)

## 功能概览

- **三级难度训练体系**
  - Level 1：技术解释、工程讨论、技术决策
  - Level 2：研究型表达、组会讨论、论文 brainstorming、实验分析
  - Level 3：高压问答、技术质疑、答辩与辩论
- **每日自动生成练习**：通过定时任务调用 `daily-task-generator`。
- **标准练习流程**：先思考，再录音作答，强化快速组织表达能力。
- **即时对练**：与 AI 导师多轮对话，支持会话回看与复盘。
- **拆书任务工坊**：将网页/文本语义拆解为任务，或列表一键导入到练习池。
- **智能分析反馈**：从词汇、内容完整性、逻辑组织、表达方法等维度给出结果。
- **周报分析**：可视化展示阶段表现变化趋势。
- **场景模拟**：按场景类型和个人背景生成定制化练习内容。

## 页面与模块

- 首页与认证：登录、忘记密码、重置密码
- 每日练习：任务列表、任务详情、练习结果
- 历史与报告：历史记录、周报页面
- 扩展训练：场景模拟、即时对练、拆书任务工坊
- 设置页：个人偏好设置

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + shadcn/ui
- 后端：Supabase（数据库 + 认证 + Edge Functions + Storage）
- AI 服务：
  - 语音识别：DashScope ASR
  - 文本生成/分析：Qwen（或 OpenAI 兼容提供方）
  - 语音合成：预留可扩展 TTS 接口

## 系统架构

### 核心数据表

- `profiles`
- `user_career_profiles`
- `practice_tasks`
- `practice_records`
- `analysis_results`
- `weekly_reports`
- `scenario_simulations`
- `live_practice_sessions`

### Edge Functions

- `speech-recognition`
- `speech-synthesis`
- `ai-analysis`
- `scenario-generation`
- `live-practice`
- `weekly-report`
- `difficulty-adjustment`
- `daily-task-generator`
- `book-task-generator`

### 存储桶

- `practice-audio`
- `scenario-audio`
- `avatars`

## 快速开始

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm lint
pnpm build
pnpm preview
```

## 环境变量

在项目根目录创建 `.env`，并配置：

- 前端
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_PRACTICE_AUDIO_BUCKET`
  - `VITE_SUPABASE_SCENARIO_AUDIO_BUCKET`
  - `VITE_SUPABASE_AVATARS_BUCKET`
- Edge Functions
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LLM_PROVIDER`（`qwen` 或 `openai-compatible`）
  - `QWEN_API_KEY`
  - `QWEN_MODEL`（可选）
  - `QWEN_BASE_URL`（可选）
  - `DASHSCOPE_ASR_MODEL`（可选）
  - `OPENAI_COMPATIBLE_API_KEY`（可选）
  - `OPENAI_COMPATIBLE_BASE_URL`（可选）

本地调试函数：

```bash
supabase functions serve --env-file .env
```

## 定时任务

建议每天 08:00 调用 `daily-task-generator`。示例（`pg_cron`）：

```sql
SELECT cron.schedule(
  'daily-task-generation',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/daily-task-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

## 权限说明

- 普通用户：
  - 管理自己的资料
  - 进行练习并查看自己的记录、报告
  - 使用场景模拟与即时对练功能
- 管理员：
  - 拥有普通用户全部权限
  - 可查看全局用户与训练记录
  - 可管理用户角色

## 许可证

© 2026 Scholavo. All rights reserved.
