DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('practice-audio', 'practice-audio', true),
  ('scenario-audio', 'scenario-audio', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '认证用户可以上传练习录音（新版）'
  ) THEN
    CREATE POLICY "认证用户可以上传练习录音（新版）" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'practice-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '所有人可以读取练习录音（新版）'
  ) THEN
    CREATE POLICY "所有人可以读取练习录音（新版）" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'practice-audio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '用户可以删除自己的练习录音（新版）'
  ) THEN
    CREATE POLICY "用户可以删除自己的练习录音（新版）" ON storage.objects
      FOR DELETE TO authenticated USING (
        bucket_id = 'practice-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '认证用户可以上传场景录音（新版）'
  ) THEN
    CREATE POLICY "认证用户可以上传场景录音（新版）" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'scenario-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '所有人可以读取场景录音（新版）'
  ) THEN
    CREATE POLICY "所有人可以读取场景录音（新版）" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'scenario-audio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '用户可以删除自己的场景录音（新版）'
  ) THEN
    CREATE POLICY "用户可以删除自己的场景录音（新版）" ON storage.objects
      FOR DELETE TO authenticated USING (
        bucket_id = 'scenario-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '认证用户可以上传头像（新版）'
  ) THEN
    CREATE POLICY "认证用户可以上传头像（新版）" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '所有人可以读取头像（新版）'
  ) THEN
    CREATE POLICY "所有人可以读取头像（新版）" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '用户可以更新自己的头像（新版）'
  ) THEN
    CREATE POLICY "用户可以更新自己的头像（新版）" ON storage.objects
      FOR UPDATE TO authenticated USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = '用户可以删除自己的头像（新版）'
  ) THEN
    CREATE POLICY "用户可以删除自己的头像（新版）" ON storage.objects
      FOR DELETE TO authenticated USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
