import { supabase } from './supabase';
import type {
  Profile,
  UserCareerProfile,
  PracticeTask,
  PracticeRecord,
  AnalysisResult,
  WeeklyReport,
  ScenarioSimulation,
  LivePracticeSession,
  SpeechRecognitionRequest,
  SpeechRecognitionResponse,
  SpeechSynthesisRequest,
  SpeechSynthesisResponse,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ScenarioGenerationRequest,
  ScenarioContent,
  LivePracticeRequest,
  LivePracticeResponse,
  WeeklyReportRequest,
  DifficultyAdjustmentRequest,
  DifficultyAdjustmentResponse,
} from '@/types';

// ==================== 用户资料相关 ====================

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ==================== 职业背景相关 ====================

export async function getUserCareerProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_career_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserCareerProfile | null;
}

export async function createOrUpdateCareerProfile(
  userId: string,
  profile: Partial<UserCareerProfile>
) {
  const existing = await getUserCareerProfile(userId);

  if (existing) {
    const { data, error } = await supabase
      .from('user_career_profiles')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as UserCareerProfile | null;
  }

  const { data, error } = await supabase
    .from('user_career_profiles')
    .insert({ ...profile, user_id: userId })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as UserCareerProfile | null;
}

// ==================== 练习任务相关 ====================

export async function getPracticeTasks(language?: string, limit = 20) {
  let query = supabase
    .from('practice_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (language) {
    query = query.eq('language', language);
  }

  const { data, error } = await query;

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getPracticeTask(taskId: string) {
  const { data, error } = await supabase
    .from('practice_tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw error;
  return data as PracticeTask | null;
}

export async function getTodayTask(userId: string, language = '中文') {
  // 调用难度调整Edge Function获取推荐任务
  const result = await callDifficultyAdjustment({ language });
  return result.task;
}

// ==================== 练习记录相关 ====================

export async function createPracticeRecord(
  userId: string,
  taskId: string,
  audioUrl?: string,
  duration?: number
) {
  const { data, error } = await supabase
    .from('practice_records')
    .insert({
      user_id: userId,
      task_id: taskId,
      audio_url: audioUrl || null,
      duration: duration || null,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as PracticeRecord | null;
}

export async function updatePracticeRecord(
  recordId: string,
  updates: Partial<PracticeRecord>
) {
  const { data, error } = await supabase
    .from('practice_records')
    .update(updates)
    .eq('id', recordId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as PracticeRecord | null;
}

export async function getPracticeRecords(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('practice_records')
    .select(`
      *,
      practice_tasks!inner (*),
      analysis_results (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getPracticeRecord(recordId: string) {
  const { data, error } = await supabase
    .from('practice_records')
    .select(`
      *,
      practice_tasks!inner (*),
      analysis_results (*)
    `)
    .eq('id', recordId)
    .maybeSingle();

  if (error) throw error;
  return data as PracticeRecord | null;
}

// ==================== 分析结果相关 ====================

export async function createAnalysisResult(
  recordId: string,
  analysis: Omit<AnalysisResult, 'id' | 'record_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      record_id: recordId,
      ...analysis,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as AnalysisResult | null;
}

// ==================== 周报相关 ====================

export async function getWeeklyReports(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getWeeklyReport(userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data as WeeklyReport | null;
}

// ==================== 场景模拟相关 ====================

export async function createScenarioSimulation(
  userId: string,
  scenarioType: string,
  scenarioContent: ScenarioContent
) {
  const { data, error } = await supabase
    .from('scenario_simulations')
    .insert({
      user_id: userId,
      scenario_type: scenarioType,
      scenario_content: scenarioContent,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as ScenarioSimulation | null;
}

export async function updateScenarioSimulation(
  simulationId: string,
  updates: Partial<ScenarioSimulation>
) {
  const { data, error } = await supabase
    .from('scenario_simulations')
    .update(updates)
    .eq('id', simulationId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as ScenarioSimulation | null;
}

export async function getScenarioSimulations(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('scenario_simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getScenarioSimulation(simulationId: string) {
  const { data, error } = await supabase
    .from('scenario_simulations')
    .select('*')
    .eq('id', simulationId)
    .maybeSingle();

  if (error) throw error;
  return data as ScenarioSimulation | null;
}

// ==================== 即时对练相关 ====================

export async function createLivePracticeSession(
  userId: string,
  sessionType?: string
) {
  const { data, error } = await supabase
    .from('live_practice_sessions')
    .insert({
      user_id: userId,
      session_type: sessionType || null,
      messages: [],
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as LivePracticeSession | null;
}

export async function updateLivePracticeSession(
  sessionId: string,
  updates: Partial<LivePracticeSession>
) {
  const { data, error } = await supabase
    .from('live_practice_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as LivePracticeSession | null;
}

export async function getLivePracticeSessions(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('live_practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ==================== Edge Functions 调用 ====================

export async function callSpeechRecognition(
  request: SpeechRecognitionRequest
): Promise<SpeechRecognitionResponse> {
  const { data, error } = await supabase.functions.invoke<SpeechRecognitionResponse>(
    'speech-recognition',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('语音识别错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '语音识别失败');
  }

  if (!data) {
    throw new Error('语音识别返回数据为空');
  }

  return data;
}

export async function callSpeechSynthesis(
  request: SpeechSynthesisRequest
): Promise<SpeechSynthesisResponse> {
  const { data, error } = await supabase.functions.invoke<SpeechSynthesisResponse>(
    'speech-synthesis',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('语音合成错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '语音合成失败');
  }

  if (!data) {
    throw new Error('语音合成返回数据为空');
  }

  return data;
}

export async function callAIAnalysis(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const { data, error } = await supabase.functions.invoke<AIAnalysisResponse>(
    'ai-analysis',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('AI分析错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || 'AI分析失败');
  }

  if (!data) {
    throw new Error('AI分析返回数据为空');
  }

  return data;
}

export async function callScenarioGeneration(
  request: ScenarioGenerationRequest
): Promise<ScenarioContent> {
  const { data, error } = await supabase.functions.invoke<ScenarioContent>(
    'scenario-generation',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('场景生成错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '场景生成失败');
  }

  if (!data) {
    throw new Error('场景生成返回数据为空');
  }

  return data;
}

export async function callLivePractice(
  request: LivePracticeRequest
): Promise<LivePracticeResponse> {
  const { data, error } = await supabase.functions.invoke<LivePracticeResponse>(
    'live-practice',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('即时对练错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '即时对练失败');
  }

  if (!data) {
    throw new Error('即时对练返回数据为空');
  }

  return data;
}

export async function callWeeklyReport(
  request: WeeklyReportRequest
): Promise<WeeklyReport> {
  const { data, error } = await supabase.functions.invoke<WeeklyReport>(
    'weekly-report',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('周报生成错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '周报生成失败');
  }

  if (!data) {
    throw new Error('周报生成返回数据为空');
  }

  return data;
}

export async function callDifficultyAdjustment(
  request: DifficultyAdjustmentRequest
): Promise<DifficultyAdjustmentResponse> {
  const { data, error } = await supabase.functions.invoke<DifficultyAdjustmentResponse>(
    'difficulty-adjustment',
    {
      body: request,
    }
  );

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('难度调整错误:', errorMsg || error?.message);
    throw new Error(errorMsg || error?.message || '难度调整失败');
  }

  if (!data) {
    throw new Error('难度调整返回数据为空');
  }

  return data;
}
