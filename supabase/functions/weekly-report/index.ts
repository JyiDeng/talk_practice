import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generateObject } from '../_shared/llm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklySummary {
  improvement_summary: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userJwtHeader = req.headers.get('x-supabase-user-jwt');
    const authHeader = req.headers.get('Authorization');
    const token = userJwtHeader || authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 验证用户
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

    const weekEndExclusive = new Date(`${weekEnd}T00:00:00.000Z`);
    weekEndExclusive.setUTCDate(weekEndExclusive.getUTCDate() + 1);

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
          speech_rate,
          missing_points
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', weekStart)
      .lt('created_at', weekEndExclusive.toISOString())
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

    const topMissingPoints = records
      .flatMap((record) => record.analysis_results || [])
      .flatMap((analysis) => analysis.missing_points || [])
      .slice(0, 8);

    let improvementSummary =
      `本周完成${count}次练习。逻辑严密性平均得分${avgLogic.toFixed(1)}分，` +
      `词汇丰富度平均得分${avgVocabulary.toFixed(1)}分，语速平稳度得分${speechRateScore.toFixed(1)}分。`;

    try {
      const summary = await generateObject<WeeklySummary>({
        messages: [
          {
            role: 'system',
            content:
              '你是一名学术与技术表达训练教练。请根据用户本周练习表现输出一段简洁、具体、可执行的中文周报总结。',
          },
          {
            role: 'user',
            content: `请根据以下数据生成周报总结：
- 周期：${weekStart} 到 ${weekEnd}
- 练习次数：${count}
- 平均逻辑得分：${avgLogic.toFixed(1)}
- 平均词汇得分：${avgVocabulary.toFixed(1)}
- 平均语速平稳度得分：${speechRateScore.toFixed(1)}
- 近期常见遗漏点：${topMissingPoints.length > 0 ? topMissingPoints.join('；') : '暂无明显遗漏'}

要求：
1. 输出 120 字以内
2. 先概括表现，再指出 1-2 个重点改进方向
3. 语气专业直接，不要空话`,
          },
        ],
        temperature: 0.5,
        maxTokens: 400,
        schema: {
          name: 'weekly_summary',
          schema: {
            type: 'object',
            properties: {
              improvement_summary: { type: 'string' },
            },
            required: ['improvement_summary'],
            additionalProperties: false,
          },
        },
      });

      improvementSummary = summary.improvement_summary;
    } catch (summaryError) {
      console.error('周报总结生成失败，使用回退文案:', summaryError);
    }

    const reportPayload = {
      user_id: user.id,
      week_start: weekStart,
      week_end: weekEnd,
      logic_score: avgLogic,
      vocabulary_score: avgVocabulary,
      speech_rate_score: speechRateScore,
      practice_count: count,
      improvement_summary: improvementSummary,
      radar_data: radarData,
    };

    // 保存周报到数据库
    const { data: report, error: insertError } = await supabase
      .from('weekly_reports')
      .upsert(reportPayload, {
        onConflict: 'user_id,week_start',
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
