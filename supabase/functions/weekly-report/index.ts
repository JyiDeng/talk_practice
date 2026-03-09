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

    const { weekStart, weekEnd } = await req.json();

    if (!weekStart || !weekEnd) {
      return new Response(
        JSON.stringify({ error: '缺少周起止日期' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 查询该周的所有练习记录和分析结果
    const { data: records, error: recordsError } = await supabase
      .from('practice_records')
      .select(`
        id,
        created_at,
        analysis_results (
          vocabulary_score,
          completeness_score,
          logic_score,
          expression_score,
          overall_score,
          speech_rate
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)
      .eq('status', 'completed');

    if (recordsError) {
      console.error('查询练习记录错误:', recordsError);
      return new Response(
        JSON.stringify({ error: '查询练习记录失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ error: '该周没有完成的练习记录' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 计算平均分数
    let totalLogic = 0;
    let totalVocabulary = 0;
    let totalSpeechRate = 0;
    let count = 0;

    for (const record of records) {
      if (record.analysis_results && record.analysis_results.length > 0) {
        const analysis = record.analysis_results[0];
        totalLogic += analysis.logic_score || 0;
        totalVocabulary += analysis.vocabulary_score || 0;
        totalSpeechRate += analysis.speech_rate || 0;
        count++;
      }
    }

    if (count === 0) {
      return new Response(
        JSON.stringify({ error: '没有有效的分析结果' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const avgLogic = totalLogic / count;
    const avgVocabulary = totalVocabulary / count;
    const avgSpeechRate = totalSpeechRate / count;

    // 计算语速平稳度得分（假设理想语速为150-180字/分钟）
    const idealSpeechRate = 165;
    const speechRateDeviation = Math.abs(avgSpeechRate - idealSpeechRate);
    const speechRateScore = Math.max(0, 100 - speechRateDeviation / 2);

    // 生成雷达图数据
    const radarData = {
      logic: avgLogic,
      vocabulary: avgVocabulary,
      speechRate: speechRateScore,
    };

    // 生成改进总结
    const improvementSummary = `本周完成${count}次练习。逻辑严密性平均得分${avgLogic.toFixed(1)}分，词汇丰富度平均得分${avgVocabulary.toFixed(1)}分，语速平稳度得分${speechRateScore.toFixed(1)}分。${
      avgLogic < 70 ? '建议加强逻辑组织能力训练。' : ''
    }${avgVocabulary < 70 ? '建议扩充专业词汇量。' : ''}${speechRateScore < 70 ? '建议调整语速，保持在150-180字/分钟。' : ''}`;

    // 保存周报到数据库
    const { data: report, error: insertError } = await supabase
      .from('weekly_reports')
      .insert({
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        logic_score: avgLogic,
        vocabulary_score: avgVocabulary,
        speech_rate_score: speechRateScore,
        practice_count: count,
        improvement_summary: improvementSummary,
        radar_data: radarData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('保存周报错误:', insertError);
      return new Response(
        JSON.stringify({ error: '保存周报失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('周报生成错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
