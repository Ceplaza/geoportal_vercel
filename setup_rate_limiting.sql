-- =====================================================
-- Rate limiting for flora measurement submissions
-- Run this in Supabase SQL Editor BEFORE deploying Edge Function
-- =====================================================

-- 1. Rate limit attempts table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'measurement',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier
  ON public.rate_limit_attempts (identifier, attempt_type, created_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Only the Edge Function (service_role) should access this table
REVOKE ALL ON public.rate_limit_attempts FROM anon, authenticated;

-- 2. Function: check and record rate limit (max 3 attempts per 10 minutes)
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_identifier text,
  p_attempt_type text DEFAULT 'measurement',
  p_window_minutes int DEFAULT 10,
  p_max_attempts int DEFAULT 3
)
RETURNS jsonb AS $$
DECLARE
  v_count int;
  v_allowed boolean;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.rate_limit_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  v_allowed := v_count < p_max_attempts;

  IF v_allowed THEN
    INSERT INTO public.rate_limit_attempts (identifier, attempt_type)
    VALUES (p_identifier, p_attempt_type);
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'attempts_used', v_count,
    'max_attempts', p_max_attempts,
    'window_minutes', p_window_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup of old records should be handled by a scheduled task or maintenance process.
