const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarioType, industry, position, language = '中文' } = await req.json();

    if (!scenarioType) {
      return new Response(
        JSON.stringify({ error: '缺少场景类型' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 构建场景生成提示词
    const systemPrompt = `你是一位专业的职场培训师，擅长设计各种职场场景模拟。请根据用户的职业背景和需求，生成一个真实、具有挑战性的职场场景。

场景应该包含：
1. 背景描述：详细的场景背景和情境
2. 角色设定：用户在场景中的角色和目标
3. 挑战点：场景中的难点和需要注意的事项
4. 评估标准：如何评估用户的表现
5. 参考要点：用户应该涵盖的关键内容

请以JSON格式返回，包含以下字段：
- title: 场景标题
- background: 背景描述
- role: 角色设定
- challenges: 挑战点数组
- evaluation_criteria: 评估标准数组
- key_points: 参考要点数组`;

    const userPrompt = `场景类型：${scenarioType}
${industry ? `行业：${industry}` : ''}
${position ? `职位：${position}` : ''}
语言：${language}

请生成一个适合的职场场景模拟。`;

    // 预留Qwen API接口
    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    
    let scenarioContent;

    if (qwenApiKey) {
      console.log('使用Aliyun Qwen API生成场景');
      // TODO: 实现Qwen API调用
      throw new Error('Qwen API集成待用户配置');
    } else {
      // 使用MiniMax作为备选
      const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
      const response = await fetch(
        'https://app-a5e3v6eh2xoh-api-Aa2PqMJnJGwL-gateway.appmiaoda.com/v1/text/chatcompletion_v2',
        {
          method: 'POST',
          headers: {
            'X-Gateway-Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'MiniMax-M2.5',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'scenario_content',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    background: { type: 'string' },
                    role: { type: 'string' },
                    challenges: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    evaluation_criteria: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    key_points: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['title', 'background', 'role', 'challenges', 'evaluation_criteria', 'key_points'],
                  additionalProperties: false,
                },
              },
            },
            temperature: 0.8,
            max_completion_tokens: 1500,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('场景生成API错误:', errorText);
        return new Response(
          JSON.stringify({ error: '场景生成失败', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return new Response(
          JSON.stringify({ error: '场景生成返回结果为空' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      scenarioContent = JSON.parse(content);
    }

    return new Response(
      JSON.stringify(scenarioContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('场景生成错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
