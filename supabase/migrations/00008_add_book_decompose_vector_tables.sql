CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.book_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text,
  topic text,
  raw_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.book_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_book_chunks_source_id ON public.book_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_book_chunks_embedding ON public.book_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

CREATE OR REPLACE FUNCTION public.upsert_book_chunk(
  p_source_id uuid,
  p_chunk_index integer,
  p_content text,
  p_embedding_literal text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.book_chunks (source_id, chunk_index, content, embedding)
  VALUES (p_source_id, p_chunk_index, p_content, p_embedding_literal::vector)
  ON CONFLICT (source_id, chunk_index) DO UPDATE
    SET content = EXCLUDED.content,
        embedding = EXCLUDED.embedding;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_book_chunks(
  p_source_id uuid,
  p_query_embedding_literal text,
  p_match_count integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index integer,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    bc.id,
    bc.source_id,
    bc.chunk_index,
    bc.content,
    1 - (bc.embedding <=> p_query_embedding_literal::vector) AS similarity
  FROM public.book_chunks bc
  WHERE bc.source_id = p_source_id
  ORDER BY bc.embedding <=> p_query_embedding_literal::vector
  LIMIT GREATEST(COALESCE(p_match_count, 8), 1);
$$;
