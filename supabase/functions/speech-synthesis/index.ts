const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'male-qn-qingse', speed = 1.0, emotion = 'calm' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: '缺少文本内容' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用MiniMax语音合成API
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    const response = await fetch(
      'https://app-a5e3v6eh2xoh-api-DLEO7Bj0lORa-gateway.appmiaoda.com/v1/t2a_v2',
      {
        method: 'POST',
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'speech-2.8-hd',
          text,
          stream: false,
          voice_setting: {
            voice_id: voice,
            speed,
            vol: 1.0,
            pitch: 0,
            emotion,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('语音合成API错误:', errorText);
      return new Response(
        JSON.stringify({ error: '语音合成失败', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    if (result.base_resp?.status_code !== 0) {
      return new Response(
        JSON.stringify({ error: result.base_resp?.status_msg || '语音合成失败' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        audioHex: result.data?.audio || '',
        audioLength: result.extra_info?.audio_length || 0,
        audioSize: result.extra_info?.audio_size || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('语音合成错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
