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
    // 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY not configured');
    }

    // 为每个难度级别生成一个新任务
    const difficultyTypes = ['level1', 'level2', 'level3'];
    const generatedTasks = [];

    for (const difficultyType of difficultyTypes) {
      // 调用场景生成API
      const scenarioResponse = await fetch(
        `${supabaseUrl}/functions/v1/scenario-generation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            difficultyType,
            language: '中文',
          }),
        }
      );

      if (!scenarioResponse.ok) {
        console.error(`Failed to generate scenario for ${difficultyType}`);
        continue;
      }

      const scenarioData = await scenarioResponse.json();

      // 构建任务数据
      let title, description, keyPoints, category;
      const difficultyLevel = difficultyType === 'level1' ? 1 : difficultyType === 'level2' ? 3 : 5;

      if (difficultyType === 'level1') {
        title = scenarioData.title || '技术口语训练';
        description = scenarioData.background;
        keyPoints = scenarioData.keywords?.map((kw: string) => ({ point: kw, weight: 0.33 })) || [];
        category = '技术解释';
      } else if (difficultyType === 'level2') {
        title = scenarioData.title || '研究讨论';
        description = `${scenarioData.background}\n\n导师提问：${scenarioData.advisor_question}`;
        keyPoints = scenarioData.thinking_hints?.map((hint: string) => ({ point: hint, weight: 0.33 })) || [];
        category = '研究讨论';
      } else {
        title = scenarioData.title || '技术质疑';
        description = `${scenarioData.background}\n\n质疑问题：${scenarioData.challenge_question}`;
        keyPoints = scenarioData.key_points?.map((kp: string) => ({ point: kp, weight: 0.33 })) || [];
        category = '技术面试';
      }

      // 插入到数据库
      const { data, error } = await supabase
        .from('practice_tasks')
        .insert({
          title,
          description,
          difficulty_level: difficultyLevel,
          difficulty_type: difficultyType,
          key_points: keyPoints,
          reference_answer: scenarioData.task,
          language: '中文',
          category,
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to insert task for ${difficultyType}:`, error);
        continue;
      }

      generatedTasks.push(data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated_count: generatedTasks.length,
        tasks: generatedTasks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in daily-task-generator:', error);
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
