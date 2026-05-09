-- ==========================================================
-- OmniAI Phase 2, 3, and 4 Advanced Schema Migration
-- ==========================================================

-- 1. Enable Vector Extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents Table for Vector Search / RAG
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- Dimension matches OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Match Documents RPC Function (Security Definer)
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  chat_id UUID,
  filename TEXT,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.chat_id,
    documents.filename,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM public.documents
  WHERE documents.user_id = (SELECT auth.uid()) -- RLS verification inside SECURITY DEFINER
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Memories Table for Long-term Context
CREATE TABLE IF NOT EXISTS public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('preference', 'writing_style', 'context')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  message_count INT NOT NULL DEFAULT 0,
  max_messages INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit Logs Table for Security & Cost Auditing
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Add columns to Chats and Messages
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS prompt_tokens INT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS completion_tokens INT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS response_time_ms INT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS search_results JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS citations JSONB;

-- 8. Add columns to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- 9. Enable RLS on New Tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. Indexes for new Tables
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_chat_id ON public.documents(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 11. Create RLS Policies
CREATE POLICY all_own_documents ON public.documents
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY all_own_memories ON public.user_memories
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY select_own_subscription ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 12. Grant Schema Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memories TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;

-- 13. System Trigger update for updated_at fields
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- 14. Trigger to Auto-create user subscriptions on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, status, message_count, max_messages)
  VALUES (NEW.id, 'free', 'active', 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();
