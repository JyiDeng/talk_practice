ALTER TABLE public.live_practice_sessions
ADD COLUMN IF NOT EXISTS analysis_summary jsonb NOT NULL DEFAULT '{"redundant_phrases": [], "grammar_issues": [], "advanced_vocabulary": [], "logic_issues": []}'::jsonb;
