ALTER TABLE public.live_practice_sessions
ADD COLUMN IF NOT EXISTS prompt_template text;
