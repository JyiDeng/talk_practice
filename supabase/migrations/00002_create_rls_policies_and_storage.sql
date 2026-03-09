-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_practice_sessions ENABLE ROW LEVEL SECURITY;

-- profiles表策略
CREATE POLICY "管理员可以访问所有用户资料" ON public.profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的资料" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- user_career_profiles表策略
CREATE POLICY "管理员可以访问所有职业背景" ON public.user_career_profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的职业背景" ON public.user_career_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的职业背景" ON public.user_career_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的职业背景" ON public.user_career_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- practice_tasks表策略（所有认证用户可读，管理员可写）
CREATE POLICY "所有认证用户可以查看练习任务" ON public.practice_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管理员可以管理练习任务" ON public.practice_tasks
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- practice_records表策略
CREATE POLICY "管理员可以访问所有练习记录" ON public.practice_records
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的练习记录" ON public.practice_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的练习记录" ON public.practice_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的练习记录" ON public.practice_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- analysis_results表策略
CREATE POLICY "管理员可以访问所有分析结果" ON public.analysis_results
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的分析结果" ON public.analysis_results
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice_records pr
      WHERE pr.id = analysis_results.record_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "系统可以插入分析结果" ON public.analysis_results
  FOR INSERT TO authenticated WITH CHECK (true);

-- weekly_reports表策略
CREATE POLICY "管理员可以访问所有周报" ON public.weekly_reports
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的周报" ON public.weekly_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "系统可以插入周报" ON public.weekly_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- scenario_simulations表策略
CREATE POLICY "管理员可以访问所有场景模拟" ON public.scenario_simulations
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的场景模拟" ON public.scenario_simulations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的场景模拟" ON public.scenario_simulations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的场景模拟" ON public.scenario_simulations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- live_practice_sessions表策略
CREATE POLICY "管理员可以访问所有对练会话" ON public.live_practice_sessions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的对练会话" ON public.live_practice_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的对练会话" ON public.live_practice_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的对练会话" ON public.live_practice_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('app-a5e3v6eh2xoh_practice_audio', 'app-a5e3v6eh2xoh_practice_audio', true),
  ('app-a5e3v6eh2xoh_scenario_audio', 'app-a5e3v6eh2xoh_scenario_audio', true),
  ('app-a5e3v6eh2xoh_avatars', 'app-a5e3v6eh2xoh_avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 存储桶策略：practice_audio
CREATE POLICY "认证用户可以上传练习录音" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'app-a5e3v6eh2xoh_practice_audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "所有人可以读取练习录音" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'app-a5e3v6eh2xoh_practice_audio');

CREATE POLICY "用户可以删除自己的练习录音" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'app-a5e3v6eh2xoh_practice_audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 存储桶策略：scenario_audio
CREATE POLICY "认证用户可以上传场景录音" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'app-a5e3v6eh2xoh_scenario_audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "所有人可以读取场景录音" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'app-a5e3v6eh2xoh_scenario_audio');

CREATE POLICY "用户可以删除自己的场景录音" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'app-a5e3v6eh2xoh_scenario_audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 存储桶策略：avatars
CREATE POLICY "认证用户可以上传头像" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'app-a5e3v6eh2xoh_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "所有人可以读取头像" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'app-a5e3v6eh2xoh_avatars');

CREATE POLICY "用户可以更新自己的头像" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'app-a5e3v6eh2xoh_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "用户可以删除自己的头像" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'app-a5e3v6eh2xoh_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );