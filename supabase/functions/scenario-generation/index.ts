import { generateObject } from '../_shared/llm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioRequest {
  scenarioType: string;
  industry?: string;
  position?: string;
  language?: string;
  targetScenarios?: string[];
}

interface ScenarioContent {
  title: string;
  background: string;
  role: string;
  challenges: string[];
  evaluation_criteria: string[];
  key_points: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      scenarioType,
      industry,
      position,
      language = '中文',
      targetScenarios = [],
    }: ScenarioRequest = await req.json();

    if (!scenarioType) {
      throw new Error('scenarioType is required');
    }

    const systemPrompt = `你是一名面向科研与工程从业者的口语训练场景设计师。

你的任务是根据用户背景生成一个可直接用于练习的口语模拟场景。

要求：
1. 输出语言必须为 ${language}
2. 场景类型必须贴近 ${scenarioType}
3. 场景要真实、具体，有明确上下文和压力点
4. 角色描述要让用户知道自己站在什么位置回答
5. challenges、evaluation_criteria、key_points 各输出 3-5 条
6. 内容聚焦 AI 表征学习、机器学习系统、软件工程研发等语境，除非用户背景明确要求其他方向`;

    const userPrompt = `请基于以下用户信息生成一个定制化练习场景：
- 场景类型：${scenarioType}
- 研究方向/行业：${industry || '未填写'}
- 职位/身份：${position || '未填写'}
- 重点训练场景：${targetScenarios.length > 0 ? targetScenarios.join('、') : '未填写'}

请给出一个适合 1-3 分钟口头回答的训练场景。`;

    const scenario = await generateObject<ScenarioContent>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      maxTokens: 1800,
      schema: {
        name: 'scenario_content',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            background: { type: 'string' },
            role: { type: 'string' },
            challenges: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: { type: 'string' },
            },
            evaluation_criteria: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: { type: 'string' },
            },
            key_points: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: { type: 'string' },
            },
          },
          required: [
            'title',
            'background',
            'role',
            'challenges',
            'evaluation_criteria',
            'key_points',
          ],
          additionalProperties: false,
        },
      },
    });

    return new Response(JSON.stringify(scenario), {
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
