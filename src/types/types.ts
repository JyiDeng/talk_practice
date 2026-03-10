// 数据库类型定义

export type UserRole = 'user' | 'admin';
export type PracticeStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type ScenarioStatus = 'pending' | 'completed';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserCareerProfile {
  id: string;
  user_id: string;
  industry: string | null;
  position: string | null;
  work_years: number | null;
  target_scenarios: string[] | null;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

export interface KeyPoint {
  point: string;
  weight: number;
}

export interface PracticeTask {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  difficulty_level: number;
  difficulty_type: string | null;
  key_points: KeyPoint[] | null;
  reference_answer: string | null;
  language: string;
  category: string | null;
  created_at: string;
}

export interface PracticeRecord {
  id: string;
  user_id: string;
  task_id: string;
  audio_url: string | null;
  transcription: string | null;
  duration: number | null;
  status: PracticeStatus;
  created_at: string;
  practice_tasks?: PracticeTask;
  analysis_results?: AnalysisResult[];
}

export interface BetterExpression {
  original: string;
  improved: string;
}

export interface AnalysisResult {
  id: string;
  record_id: string;
  vocabulary_score: number | null;
  completeness_score: number | null;
  logic_score: number | null;
  expression_score: number | null;
  overall_score: number | null;
  missing_points: string[] | null;
  suggestions: string | null;
  better_expressions: BetterExpression[] | null;
  speech_rate: number | null;
  created_at: string;
}

export interface RadarData {
  logic: number;
  vocabulary: number;
  speechRate: number;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  logic_score: number | null;
  vocabulary_score: number | null;
  speech_rate_score: number | null;
  practice_count: number;
  improvement_summary: string | null;
  radar_data: RadarData | null;
  created_at: string;
}

export interface ScenarioContent {
  title: string;
  background: string;
  role: string;
  challenges: string[];
  evaluation_criteria: string[];
  key_points: string[];
}

export interface ScenarioSimulation {
  id: string;
  user_id: string;
  scenario_type: string;
  scenario_content: ScenarioContent | null;
  audio_url: string | null;
  feedback: string | null;
  status: ScenarioStatus;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface LivePracticeSession {
  id: string;
  user_id: string;
  session_type: string | null;
  prompt_template: string | null;
  messages: ChatMessage[] | null;
  feedback: string | null;
  duration: number | null;
  created_at: string;
  ended_at: string | null;
}

// Edge Function 请求/响应类型

export interface SpeechRecognitionRequest {
  audioBase64?: string;
  audioUrl?: string;
  format?: 'wav' | 'm4a';
  rate?: 16000 | 8000;
  languageHint?: 'zh' | 'en';
}

export interface SpeechRecognitionResponse {
  transcription: string;
  corpus_no: string;
}

export interface SpeechSynthesisRequest {
  text: string;
  voice?: string;
  speed?: number;
  emotion?: string;
}

export interface SpeechSynthesisResponse {
  audioHex: string;
  audioLength: number;
  audioSize: number;
}

export interface AIAnalysisRequest {
  transcription: string;
  referenceAnswer: string;
  keyPoints: KeyPoint[];
  language?: string;
  duration?: number;
}

export interface AIAnalysisResponse {
  vocabulary_score: number;
  completeness_score: number;
  logic_score: number;
  expression_score: number;
  overall_score: number;
  missing_points: string[];
  suggestions: string;
  better_expressions: BetterExpression[];
  speech_rate: number | null;
}

export interface ScenarioGenerationRequest {
  scenarioType: string;
  industry?: string;
  position?: string;
  language?: string;
  targetScenarios?: string[];
}

export interface LivePracticeRequest {
  messages: ChatMessage[];
  sessionType?: string;
  language?: string;
  customPrompt?: string;
}

export interface LivePracticeResponse {
  message: string;
}

export interface WeeklyReportRequest {
  weekStart: string;
  weekEnd: string;
}

export interface DifficultyAdjustmentRequest {
  language?: string;
}

export interface DifficultyAdjustmentResponse {
  recommendedLevel: number;
  task: PracticeTask | null;
}
