const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

interface DashScopeTaskResponse {
  output?: {
    task_id?: string;
    task_status?: TaskStatus;
    results?: Array<{
      transcription_url?: string;
    }>;
    message?: string;
  };
}

async function pollTask(taskId: string, apiKey: string) {
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`语音识别任务查询失败: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as DashScopeTaskResponse;
    const status = result.output?.task_status;

    if (status === 'SUCCEEDED') {
      return result;
    }

    if (status === 'FAILED') {
      throw new Error(result.output?.message || '语音识别任务失败');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('语音识别超时，请稍后重试');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, format = 'wav', languageHint = 'zh' } = await req.json();

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: '缺少 audioUrl，语音识别需要可访问的音频地址' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('QWEN_API_KEY');
    if (!apiKey) {
      throw new Error('QWEN_API_KEY is not configured');
    }

    const model = Deno.env.get('DASHSCOPE_ASR_MODEL') || 'paraformer-v2';
    const createTaskResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model,
          input: {
            file_urls: [audioUrl],
          },
          parameters: {
            language_hints: [languageHint],
            format,
          },
        }),
      }
    );

    if (!createTaskResponse.ok) {
      const errorText = await createTaskResponse.text();
      throw new Error(`语音识别任务创建失败: ${createTaskResponse.status} ${errorText}`);
    }

    const taskResponse = (await createTaskResponse.json()) as DashScopeTaskResponse;
    const taskId = taskResponse.output?.task_id;

    if (!taskId) {
      throw new Error('语音识别任务创建成功但未返回 task_id');
    }

    const finalTask = await pollTask(taskId, apiKey);
    const transcriptionUrl = finalTask.output?.results?.[0]?.transcription_url;

    if (!transcriptionUrl) {
      throw new Error('语音识别完成但未返回转写结果地址');
    }

    const transcriptionResponse = await fetch(transcriptionUrl);
    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error(`获取语音识别结果失败: ${transcriptionResponse.status} ${errorText}`);
    }

    const transcriptionPayload = await transcriptionResponse.json();
    const transcription =
      transcriptionPayload?.transcripts?.[0]?.text ||
      transcriptionPayload?.results?.[0]?.transcript ||
      '';

    return new Response(
      JSON.stringify({
        transcription,
        corpus_no: taskId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('语音识别错误:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
