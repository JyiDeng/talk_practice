-- 创建枚举类型
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.practice_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');
CREATE TYPE public.scenario_status AS ENUM ('pending', 'completed');

-- 创建profiles表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  username text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建用户职业背景表
CREATE TABLE public.user_career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  industry text,
  position text,
  work_years integer,
  target_scenarios text[],
  language_preference text DEFAULT '中文',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建练习任务表
CREATE TABLE public.practice_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  difficulty_level integer NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  key_points jsonb,
  reference_answer text,
  language text NOT NULL DEFAULT '中文',
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建练习记录表
CREATE TABLE public.practice_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.practice_tasks(id) ON DELETE CASCADE,
  audio_url text,
  transcription text,
  duration integer,
  status public.practice_status NOT NULL DEFAULT 'pending'::public.practice_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建分析结果表
CREATE TABLE public.analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.practice_records(id) ON DELETE CASCADE,
  vocabulary_score integer CHECK (vocabulary_score BETWEEN 0 AND 100),
  completeness_score integer CHECK (completeness_score BETWEEN 0 AND 100),
  logic_score integer CHECK (logic_score BETWEEN 0 AND 100),
  expression_score integer CHECK (expression_score BETWEEN 0 AND 100),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  missing_points jsonb,
  suggestions text,
  better_expressions jsonb,
  speech_rate float,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建周报表
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  logic_score float,
  vocabulary_score float,
  speech_rate_score float,
  practice_count integer DEFAULT 0,
  improvement_summary text,
  radar_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- 创建场景模拟表
CREATE TABLE public.scenario_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_type text NOT NULL,
  scenario_content jsonb,
  audio_url text,
  feedback text,
  status public.scenario_status NOT NULL DEFAULT 'pending'::public.scenario_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建即时对练会话表
CREATE TABLE public.live_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type text,
  messages jsonb,
  feedback text,
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- 创建索引
CREATE INDEX idx_practice_records_user_id ON public.practice_records(user_id);
CREATE INDEX idx_practice_records_task_id ON public.practice_records(task_id);
CREATE INDEX idx_analysis_results_record_id ON public.analysis_results(record_id);
CREATE INDEX idx_weekly_reports_user_id ON public.weekly_reports(user_id);
CREATE INDEX idx_scenario_simulations_user_id ON public.scenario_simulations(user_id);
CREATE INDEX idx_live_practice_sessions_user_id ON public.live_practice_sessions(user_id);

-- 创建触发器函数：自动同步用户到profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  INSERT INTO public.profiles (id, email, phone, role, username)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    SPLIT_PART(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建辅助函数：检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;