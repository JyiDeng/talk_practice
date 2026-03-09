import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, referenceAnswer, keyPoints, language = '中文' } = await req.json();

    if (!transcription || !referenceAnswer) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 构建分析提示词
    const systemPrompt = `你是一位专业的职场表达能力评估专家。请从以下四个维度分析用户的表达：
1. 词汇运用（0-100分）：词汇的丰富性、准确性和专业性
2. 内容完整性（0-100分）：是否涵盖了所有关键信息点
3. 逻辑组织（0-100分）：表达的逻辑性、条理性和连贯性
4. 表达方法（0-100分）：表达的清晰度、说服力和感染力

请以JSON格式返回分析结果，包含：
- vocabulary_score: 词汇运用得分
- completeness_score: 内容完整性得分
- logic_score: 逻辑组织得分
- expression_score: 表达方法得分
- overall_score: 总体得分
- missing_points: 遗漏的关键点数组
- suggestions: 改进建议（字符串）
- better_expressions: 更好的表达方式数组，每项包含original和improved字段`;

    const userPrompt = `参考答案：
${referenceAnswer}

关键信息点：
${JSON.stringify(keyPoints, null, 2)}

用户表达：
${transcription}

请分析用户的表达并给出评分和建议。`;

    // 预留Aliyun Qwen API接口
    // 用户可以在这里配置自己的Qwen API Key
    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    
    let analysisResult;

    if (qwenApiKey) {
      // 使用用户配置的Qwen API
      // 这里预留接口，用户需要根据Qwen API文档实现
      console.log('使用Aliyun Qwen API进行分析');
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
                name: 'analysis_result',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    vocabulary_score: { type: 'integer' },
                    completeness_score: { type: 'integer' },
                    logic_score: { type: 'integer' },
                    expression_score: { type: 'integer' },
                    overall_score: { type: 'integer' },
                    missing_points: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    suggestions: { type: 'string' },
                    better_expressions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          original: { type: 'string' },
                          improved: { type: 'string' },
                        },
                        required: ['original', 'improved'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    'vocabulary_score',
                    'completeness_score',
                    'logic_score',
                    'expression_score',
                    'overall_score',
                    'missing_points',
                    'suggestions',
                    'better_expressions',
                  ],
                  additionalProperties: false,
                },
              },
            },
            temperature: 0.7,
            max_completion_tokens: 2000,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI分析API错误:', errorText);
        return new Response(
          JSON.stringify({ error: 'AI分析失败', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return new Response(
          JSON.stringify({ error: 'AI分析返回结果为空' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      analysisResult = JSON.parse(content);
    }

    // 计算语速（字/分钟）
    const wordCount = transcription.length;
    const estimatedDuration = 60; // 假设60秒，实际应从录音时长获取
    const speechRate = (wordCount / estimatedDuration) * 60;

    return new Response(
      JSON.stringify({
        ...analysisResult,
        speech_rate: speechRate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI分析错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
