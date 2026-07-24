-- =====================================================
-- Update RLS for flora_conteos_anuales
-- Only Edge Function (service_role) can INSERT/UPDATE
-- Public can still SELECT (for chart display)
-- Run this AFTER setting up rate limiting
-- =====================================================

-- Drop open INSERT/UPDATE policies
DROP POLICY IF EXISTS "Allow anon insert" ON public.flora_conteos_anuales;
DROP POLICY IF EXISTS "Allow anon update" ON public.flora_conteos_anuales;

-- Revoke direct write access from anon and authenticated roles
REVOKE INSERT, UPDATE ON public.flora_conteos_anuales FROM anon, authenticated;

-- Keep public SELECT (required for the chart and modal prefill)
-- The existing "Allow anon read" policy remains active
