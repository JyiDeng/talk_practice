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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 验证用户
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '用户验证失败' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { language = '中文' } = await req.json();

    // 查询用户最近5次练习的平均得分
    const { data: recentRecords, error: recordsError } = await supabase
      .from('practice_records')
      .select(`
        id,
        task_id,
        practice_tasks!inner (difficulty_level),
        analysis_results (overall_score)
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recordsError) {
      console.error('查询练习记录错误:', recordsError);
      return new Response(
        JSON.stringify({ error: '查询练习记录失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recommendedLevel = 1; // 默认难度

    if (recentRecords && recentRecords.length > 0) {
      // 计算平均得分
      let totalScore = 0;
      let count = 0;
      let currentLevel = 1;

      for (const record of recentRecords) {
        if (record.analysis_results && record.analysis_results.length > 0) {
          totalScore += record.analysis_results[0].overall_score || 0;
          count++;
        }
        if (record.practice_tasks) {
          currentLevel = record.practice_tasks.difficulty_level;
        }
      }

      if (count > 0) {
        const avgScore = totalScore / count;

        // 根据平均得分调整难度
        if (avgScore >= 85) {
          // 表现优秀，提升难度
          recommendedLevel = Math.min(5, currentLevel + 1);
        } else if (avgScore >= 70) {
          // 表现良好，保持当前难度
          recommendedLevel = currentLevel;
        } else if (avgScore >= 60) {
          // 表现一般，保持或略降难度
          recommendedLevel = Math.max(1, currentLevel - 0.5);
        } else {
          // 表现较差，降低难度
          recommendedLevel = Math.max(1, currentLevel - 1);
        }
      }
    }

    // 查询推荐难度的任务
    const { data: recommendedTasks, error: tasksError } = await supabase
      .from('practice_tasks')
      .select('*')
      .eq('language', language)
      .gte('difficulty_level', Math.floor(recommendedLevel))
      .lte('difficulty_level', Math.ceil(recommendedLevel))
      .order('created_at', { ascending: false })
      .limit(10);

    if (tasksError) {
      console.error('查询推荐任务错误:', tasksError);
      return new Response(
        JSON.stringify({ error: '查询推荐任务失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 随机选择一个任务
    const randomTask = recommendedTasks && recommendedTasks.length > 0
      ? recommendedTasks[Math.floor(Math.random() * recommendedTasks.length)]
      : null;

    return new Response(
      JSON.stringify({
        recommendedLevel,
        task: randomTask,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('难度调整错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
