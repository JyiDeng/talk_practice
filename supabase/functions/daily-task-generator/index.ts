import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generatePracticeTask, type DifficultyType } from '../_shared/question-generator.ts';

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

    // 为每个难度级别生成一个新任务
    const difficultyTypes: DifficultyType[] = ['level1', 'level2', 'level3'];
    const generatedTasks = [];

    for (const difficultyType of difficultyTypes) {
      try {
        const generated = await generatePracticeTask(difficultyType, '中文');
        const difficultyLevel = difficultyType === 'level1' ? 1 : difficultyType === 'level2' ? 3 : 5;

        const { data, error } = await supabase
          .from('practice_tasks')
          .insert({
            title: generated.title,
            description: generated.description,
            difficulty_level: difficultyLevel,
            difficulty_type: difficultyType,
            key_points: generated.key_points,
            reference_answer: generated.reference_answer,
            language: generated.language,
            category: generated.category,
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to insert task for ${difficultyType}:`, error);
          continue;
        }

        generatedTasks.push(data);
      } catch (error) {
        console.error(`Failed to generate task for ${difficultyType}:`, error);
      }
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
