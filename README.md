# 学术口语训练系统

一款针对AI表征学习与软件工程研究人员的技术表达训练平台，通过每日学术场景练习、智能语音分析、定制化技术讨论等方式提升学术表达和技术沟通能力。

## 功能特点

### 核心功能
- **三级难度训练体系**
  - **Level 1 - 渐进难度口语训练**：技术解释、工程讨论、技术决策
  - **Level 2 - 研究型口语训练**：组会讨论、论文brainstorming、实验分析
  - **Level 3 - 高压面试/技术质疑**：技术面试、研究答辩、技术辩论

- **每日自动生成练习**：系统每天早上8点自动生成三个难度级别的新练习任务
- **智能练习流程**：30秒思考时间 + 1分钟回答时间，培养快速组织思路的能力
- **智能语音分析**：从词汇运用、内容完整性、逻辑组织、表达方法四个维度分析
- **周报生成**：每周自动生成表达力分析报告，使用雷达图展示提升轨迹
- **即时对练功能**：与虚拟技术导师进行实时对话，获得即时反馈

### 技术特点
- 专注于AI表征学习和软件工程方向
- 真实科研和工程场景模拟
- 低耦合设计，易于扩展
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

### 2. 开始练习
- 系统每天自动生成三个难度级别的练习任务
- 选择适合自己的难度开始练习
- 先思考30秒，然后用1分钟时间回答

### 3. 查看分析报告
- 练习完成后查看详细的AI分析报告
- 了解自己在各个维度的表现
- 获得针对性的改进建议

## 使用指南

### 每日练习

#### Level 1 - 渐进难度口语训练
适合每天练习，从简单解释到复杂技术讨论：
- **技术解释**：解释一个概念、模型设计、系统模块
- **工程讨论**：讨论系统设计、模型选择、性能问题
- **技术决策**：在多个方案中做决策并说明理由

#### Level 2 - 研究型口语训练
模拟博士组会和学术讨论：
- 研究组会讨论
- 论文brainstorming
- 实验失败分析
- 模型设计讨论
- 研究方向探索

#### Level 3 - 高压面试/技术质疑
最强训练模式：
- 技术面试
- 系统设计评审
- 论文答辩
- 实验方法质疑
- 模型设计挑战

### 练习流程
1. 选择一个练习任务
2. 阅读场景描述和关键要点
3. **思考30秒**：组织你的回答思路
4. **录音1分钟**：清晰表达你的观点
5. 系统自动进行语音识别和AI分析
6. 查看详细的分析报告

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

### 即时对练
1. 与虚拟技术导师进行实时对话
2. 获得关于技术表达的即时反馈
3. 支持反复练习与即时纠正

## 系统架构

### 数据库表结构
- `profiles` - 用户资料
- `user_career_profiles` - 用户偏好设置
- `practice_tasks` - 练习任务（包含difficulty_type字段）
- `practice_records` - 练习记录
- `analysis_results` - 分析结果
- `weekly_reports` - 周报
- `scenario_simulations` - 场景模拟
- `live_practice_sessions` - 即时对练会话

### Edge Functions
- `speech-recognition` - 语音识别
- `speech-synthesis` - 语音合成
- `ai-analysis` - AI分析
- `scenario-generation` - 场景生成（支持三种难度模板）
- `live-practice` - 即时对练
- `weekly-report` - 周报生成
- `difficulty-adjustment` - 难度调整
- `daily-task-generator` - 每日任务自动生成

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
   - 建议时长：1分钟左右
   - 最长时长：180秒（3分钟）

2. **练习建议**
   - 先从Level 1开始，逐步提升难度
   - 充分利用30秒思考时间组织思路
   - 回答时注意覆盖所有关键要点
   - 保持语速平稳，理想语速：150-180字/分钟

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

### 定时任务设置
系统需要配置定时任务每天早上8点调用`daily-task-generator` Edge Function生成新的练习任务。

可以使用Supabase的pg_cron扩展或外部定时任务服务（如GitHub Actions、Vercel Cron等）来实现。

示例（使用pg_cron）：
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

## 许可证

© 2026 学术口语训练系统. All rights reserved.
