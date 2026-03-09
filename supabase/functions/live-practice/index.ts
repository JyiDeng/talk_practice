const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionType, language = '中文' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '缺少对话消息' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 构建虚拟导师的系统提示词
    const systemPrompt = `你是一位经验丰富的职场表达能力导师，专注于帮助职场人士提升沟通能力。

你的职责：
1. 与用户进行即时对话练习
2. 针对用户的表达给予实时反馈
3. 指出语气、语调、用词等方面的问题
4. 提供具体的改进建议
5. 鼓励用户并保持积极的氛围

请用${language}与用户交流，保持专业、友好、耐心的态度。`;

    // 预留Qwen API接口
    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    
    let assistantMessage;

    if (qwenApiKey) {
      console.log('使用Aliyun Qwen API进行对练');
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
              ...messages,
            ],
            temperature: 0.8,
            max_completion_tokens: 800,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('即时对练API错误:', errorText);
        return new Response(
          JSON.stringify({ error: '即时对练失败', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      assistantMessage = result.choices?.[0]?.message?.content;

      if (!assistantMessage) {
        return new Response(
          JSON.stringify({ error: '导师回复为空' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('即时对练错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
