# 职场表达力提升系统

一款针对职场人士的中文和英文表达能力训练平台，通过每日职场案例练习、智能语音分析、定制化场景模拟等方式提升职场沟通能力。

## 功能特点

### 核心功能
- **每日练习任务** - 系统推送职场案例或新闻短片，用户录音概括，获得智能分析反馈
- **智能语音分析** - 从词汇运用、内容完整性、逻辑组织、表达方法四个维度分析用户表达
- **难度智能调整** - 根据用户表现动态调整练习难度
- **周报生成** - 每周自动生成表达力分析报告，使用雷达图展示提升轨迹
- **定制化场景模拟** - 根据职业背景生成专属的面试模拟或汇报场景
- **即时对练功能** - 与虚拟职场导师进行实时对话，获得即时反馈

### 技术特点
- 支持中英文双语训练
- 低耦合设计，易于扩展
- 预留Aliyun Qwen API接口
- 完整的用户认证和权限管理
- 响应式设计，支持桌面和移动端

## 技术栈

- **前端**: React + TypeScript + shadcn/ui + Tailwind CSS
- **后端**: Supabase (数据库 + 认证 + Edge Functions + Storage)
- **AI服务**: 
  - 语音识别: 百度短语音识别API
  - 语音合成: MiniMax语音合成API
  - AI分析: MiniMax对话API (备选) / Aliyun Qwen (用户自配)

## 快速开始

### 1. 注册账户
- 访问系统并注册账户
- 第一个注册的用户将自动成为管理员

### 2. 完善个人信息
- 在"个人设置"页面填写职业背景信息
- 选择语言偏好和目标场景

### 3. 开始练习
- 在首页查看今日推荐任务
- 观看视频后录音概括
- 查看AI分析报告和改进建议

## 配置Aliyun Qwen API（可选）

系统默认使用MiniMax API进行AI分析。如果您希望使用自己的Aliyun Qwen API，请按以下步骤配置：

### 步骤1: 获取Qwen API Key
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 创建应用并获取API Key

### 步骤2: 配置环境变量
在Supabase项目中添加环境变量：
- 变量名: `QWEN_API_KEY`
- 变量值: 您的Qwen API Key

### 步骤3: 修改Edge Functions
在以下Edge Functions中实现Qwen API调用：
- `supabase/functions/ai-analysis/index.ts`
- `supabase/functions/scenario-generation/index.ts`
- `supabase/functions/live-practice/index.ts`

参考Qwen API文档实现相应的调用逻辑。

## 使用指南

### 每日练习
1. 系统每天推荐一个练习任务
2. 观看视频后点击"开始录音"
3. 用1-2分钟概括视频内容
4. 系统自动进行语音识别和AI分析
5. 查看详细的分析报告

### 分析维度
- **词汇运用** (0-100分) - 词汇的丰富性、准确性和专业性
- **内容完整性** (0-100分) - 是否涵盖所有关键信息点
- **逻辑组织** (0-100分) - 表达的逻辑性、条理性和连贯性
- **表达方法** (0-100分) - 表达的清晰度、说服力和感染力

### 周报分析
- 每周一可生成上周的表达力分析报告
- 雷达图展示三个核心维度：
  - 逻辑严密性
  - 词汇丰富度
  - 语速平稳度

### 场景模拟
1. 选择场景类型（面试、汇报、演讲等）
2. 系统根据您的职业背景生成定制化场景
3. 查看场景背景、角色设定、挑战点和评估标准

### 即时对练
1. 与虚拟职场导师进行实时对话
2. 获得关于语气语调的即时反馈
3. 支持反复练习与即时纠正

## 系统架构

### 数据库表结构
- `profiles` - 用户资料
- `user_career_profiles` - 用户职业背景
- `practice_tasks` - 练习任务
- `practice_records` - 练习记录
- `analysis_results` - 分析结果
- `weekly_reports` - 周报
- `scenario_simulations` - 场景模拟
- `live_practice_sessions` - 即时对练会话

### Edge Functions
- `speech-recognition` - 语音识别
- `speech-synthesis` - 语音合成
- `ai-analysis` - AI分析
- `scenario-generation` - 场景生成
- `live-practice` - 即时对练
- `weekly-report` - 周报生成
- `difficulty-adjustment` - 难度调整

### 存储桶
- `app-a5e3v6eh2xoh_practice_audio` - 练习录音
- `app-a5e3v6eh2xoh_scenario_audio` - 场景模拟录音
- `app-a5e3v6eh2xoh_avatars` - 用户头像

## 权限说明

### 用户权限
- 查看和编辑自己的资料
- 进行练习并查看自己的记录
- 生成和查看自己的周报
- 使用场景模拟和即时对练功能

### 管理员权限
- 所有用户权限
- 查看所有用户信息
- 管理用户角色
- 查看所有练习记录和分析结果

## 注意事项

1. **录音要求**
   - 支持格式：WAV、M4A
   - 采样率：16000 Hz
   - 最长时长：180秒（3分钟）

2. **语速建议**
   - 理想语速：150-180字/分钟
   - 过快或过慢都会影响语速平稳度得分

3. **API配额**
   - 系统使用的第三方API有调用配额限制
   - 如遇到配额超限错误，请稍后再试

4. **浏览器兼容性**
   - 推荐使用Chrome、Edge、Safari等现代浏览器
   - 需要授权麦克风权限才能录音

## 开发说明

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行lint检查
npm run lint

# 构建生产版本
npm run build
```

### 环境变量
- `SUPABASE_URL` - Supabase项目URL
- `SUPABASE_ANON_KEY` - Supabase匿名密钥
- `QWEN_API_KEY` - Aliyun Qwen API密钥（可选）

## 许可证

© 2026 职场表达力提升系统. All rights reserved.
