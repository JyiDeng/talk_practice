import { generateText } from '../_shared/llm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionType, language = '中文', customPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '缺少对话消息' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseSystemPrompt = `你是一位经验丰富的沟通训练导师。

你的职责：
1. 与用户进行即时对话练习
2. 针对用户的表达给予实时反馈
3. 指出逻辑、语气、措辞和结构上的问题
4. 提供简洁、具体、可执行的改进建议

请用${language}与用户交流，保持专业、直接、耐心的风格。当前会话类型：${sessionType || '即时对练'}。`;

    const normalizedCustomPrompt =
      typeof customPrompt === 'string' ? customPrompt.trim() : '';
    const systemPrompt = normalizedCustomPrompt
      ? `${baseSystemPrompt}\n\n以下是用户指定的训练要求，请严格遵循：\n${normalizedCustomPrompt}`
      : baseSystemPrompt;

    const assistantMessage = await generateText({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.8,
      maxTokens: 900,
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('即时对练错误:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
