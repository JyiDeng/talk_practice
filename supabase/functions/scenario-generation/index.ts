const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioRequest {
  difficultyType: 'level1' | 'level2' | 'level3';
  language?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { difficultyType, language = '中文' }: ScenarioRequest = await req.json();

    // 根据难度类型选择不同的提示词模板
    let systemPrompt = '';
    let userPrompt = '';

    if (difficultyType === 'level1') {
      // 渐进难度口语训练
      systemPrompt = `你是一个"技术口语训练场景生成器"。

用户是一名从事 AI 表征学习 / 机器学习系统 / 软件工程研发 的工程师，希望通过模拟真实工作场景来练习口语表达能力。

你的任务是生成新的技术讨论场景，难度分为三类（随机选择一个）：

Level 1 — 技术解释  
例如：解释一个概念、一个模型设计、一个系统模块。

Level 2 — 工程讨论  
例如：讨论系统设计、模型选择、性能问题。

Level 3 — 技术决策  
例如：在多个方案中做决策并说明理由。

规则：
1. 每次只生成一个场景
2. 场景必须真实，类似技术讨论、模型设计、系统架构、数据pipeline、模型训练问题、实验分析
3. 内容长度 80-150 字
4. 语言使用自然中文
5. 用户回答时间目标 30秒-2分钟

输出格式必须是JSON：
{
  "difficulty": "Level 1/2/3",
  "scenario": "场景描述",
  "task": "用户需要回答什么",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`;

      userPrompt = '请生成一个新的技术口语训练场景。';

    } else if (difficultyType === 'level2') {
      // 研究型口语训练
      systemPrompt = `你是一个"科研讨论模拟器"。

用户是一名研究 AI 表征学习 的工程师/研究者。

你的任务是生成模拟研究组会讨论场景，让用户练习解释研究思路和技术选择。

场景应类似：
- 研究组会
- 论文 brainstorming
- 实验失败分析
- 模型设计讨论
- 研究方向探索

要求：
1. 每次生成一个新的研究讨论情境
2. 场景必须具有真实科研环境的感觉
3. 用户需要解释自己的研究思路
4. 内容 100-180 字
5. 鼓励用户说 1-3 分钟

输出格式必须是JSON：
{
  "research_scenario": "研究讨论背景",
  "advisor_question": "导师提出的问题",
  "task": "用户需要如何回答",
  "thinking_hints": ["提示1", "提示2", "提示3"]
}`;

      userPrompt = '请生成一个新的科研讨论场景。';

    } else if (difficultyType === 'level3') {
      // 高压面试/技术质疑训练
      systemPrompt = `你是一名"技术质疑者"。

用户是一名 AI / 表征学习 / 软件系统工程师。

你的任务是模拟一个严格的技术评审者，对用户提出具有挑战性的技术问题，让用户进行口头解释。

场景应类似：
- 技术面试
- 系统设计评审
- 论文答辩
- 实验方法质疑
- 模型设计挑战

规则：
1. 每次只生成一个问题场景
2. 问题必须具有挑战性
3. 不允许简单问题
4. 用户需要解释 reasoning
5. 内容 80-140 字

输出格式必须是JSON：
{
  "scenario": "技术讨论背景",
  "challenge_question": "评审者提出的挑战",
  "task": "用户需要如何回答",
  "key_points": ["关键点1", "关键点2", "关键点3"]
}`;

      userPrompt = '请生成一个新的技术质疑场景。';
    }

    // 调用MiniMax API
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY not configured');
    }

    const response = await fetch(
      'https://app-a5e3v6eh2xoh-api-Aa2PqMJnJGwL-gateway.appmiaoda.com/v1/text/chatcompletion_v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.5',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.9,
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in MiniMax response');
    }

    // 解析JSON响应
    const scenarioData = JSON.parse(content);

    // 转换为统一格式
    let result;
    if (difficultyType === 'level1') {
      result = {
        title: `${scenarioData.difficulty} - 技术口语训练`,
        background: scenarioData.scenario,
        task: scenarioData.task,
        keywords: scenarioData.keywords,
        difficulty_type: difficultyType,
      };
    } else if (difficultyType === 'level2') {
      result = {
        title: '研究讨论场景',
        background: scenarioData.research_scenario,
        advisor_question: scenarioData.advisor_question,
        task: scenarioData.task,
        thinking_hints: scenarioData.thinking_hints,
        difficulty_type: difficultyType,
      };
    } else {
      result = {
        title: '技术质疑场景',
        background: scenarioData.scenario,
        challenge_question: scenarioData.challenge_question,
        task: scenarioData.task,
        key_points: scenarioData.key_points,
        difficulty_type: difficultyType,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in scenario-generation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
