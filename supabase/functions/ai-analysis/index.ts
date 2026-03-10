import { generateObject } from '../_shared/llm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  vocabulary_score: number;
  completeness_score: number;
  logic_score: number;
  expression_score: number;
  overall_score: number;
  missing_points: string[];
  suggestions: string;
  better_expressions: Array<{
    original: string;
    improved: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      transcription,
      referenceAnswer,
      keyPoints,
      language = '中文',
      duration,
    } = await req.json();

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

    const analysisResult = await generateObject<AnalysisResult>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 2000,
      schema: {
        name: 'analysis_result',
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
    });

    // 计算语速（字/分钟）
    const wordCount = transcription.length;
    const speechRate =
      typeof duration === 'number' && duration > 0
        ? Math.round((wordCount / duration) * 60)
        : null;

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
