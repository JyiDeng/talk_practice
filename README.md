# Scholavo

AI-powered speaking practice for researchers and engineers.

EN: Scholavo is an AI-powered speaking practice platform that helps researchers and engineers improve structured technical communication through daily drills, real-time coaching, and actionable analysis.

中文：Scholavo（学述）是一个 AI 驱动的口语训练平台，通过每日任务、实时对练与可执行分析，帮助研究者和工程师提升结构化技术表达能力。

Language: [简体中文](README.zh-CN.md)

## What It Does

- 3-level practice system for technical explanation, research discussion, and high-pressure defense.
- Daily auto-generated tasks (scheduled generator) to keep practice fresh.
- Timed practice loop: think first, then record and respond.
- AI analysis after each attempt (vocabulary, completeness, logic, expression quality).
- Weekly report with trend insights and radar visualization.
- Live practice chat with an AI mentor and session review.
- Scenario simulation for role-based communication drills.
- Book-to-task workbench to turn source material into new practice tasks.

## Core Product Areas

- Daily Practice: structured tasks by difficulty.
- Practice History & Result Review: attempt records and detailed analysis.
- Weekly Reports: periodic progress summary.
- Scenario Simulation: generated role-play situations.
- Live Practice: multi-turn conversational coaching.
- Book Decompose Workbench: generate/import tasks and save them to the daily pool.

## Tech Stack

- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- AI/Voice:
  - Speech recognition: DashScope ASR
  - Text generation and analysis: Qwen (or OpenAI-compatible provider)
  - Speech synthesis: extensible custom TTS interface

## Architecture Overview

### Main Tables

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

### Storage Buckets

- `practice-audio`
- `scenario-audio`
- `avatars`

## Quick Start

```bash
pnpm install
pnpm dev
```

Other common commands:

```bash
pnpm lint
pnpm build
pnpm preview
```

## Environment Variables

Create `.env` (for local app + local function serving) and define:

- Frontend
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_PRACTICE_AUDIO_BUCKET`
  - `VITE_SUPABASE_SCENARIO_AUDIO_BUCKET`
  - `VITE_SUPABASE_AVATARS_BUCKET`
- Edge Functions
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LLM_PROVIDER` (`qwen` or `openai-compatible`)
  - `QWEN_API_KEY`
  - `QWEN_MODEL` (optional)
  - `QWEN_BASE_URL` (optional)
  - `DASHSCOPE_ASR_MODEL` (optional)
  - `OPENAI_COMPATIBLE_API_KEY` (optional)
  - `OPENAI_COMPATIBLE_BASE_URL` (optional)

Serve functions locally with the same env file:

```bash
supabase functions serve --env-file .env
```

## Scheduling Daily Task Generation

Set up a daily cron job (08:00) to trigger `daily-task-generator`.

Example using `pg_cron`:

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

## Permissions

- User:
  - Manage own profile
  - Complete practices and view own results/reports
  - Use scenarios and live practice
- Admin:
  - All user permissions
  - View users and records globally
  - Manage user roles

## License

Copyright (c) 2026 Scholavo. All rights reserved.
