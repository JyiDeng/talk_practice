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
    const { audioBase64, format = 'wav', rate = 16000 } = await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: '缺少音频数据' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 调用百度语音识别API
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    const response = await fetch(
      'https://app-a5e3v6eh2xoh-api-Aa2PZnjEw5NL-gateway.appmiaoda.com/server_api',
      {
        method: 'POST',
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          rate,
          cuid: crypto.randomUUID(),
          speech: audioBase64,
          len: Math.ceil(audioBase64.length * 0.75), // base64解码后的字节数估算
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('语音识别API错误:', errorText);
      return new Response(
        JSON.stringify({ error: '语音识别失败', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    if (result.err_no !== 0) {
      return new Response(
        JSON.stringify({ error: result.err_msg || '语音识别失败' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        transcription: result.result?.[0] || '',
        corpus_no: result.corpus_no,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('语音识别错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
