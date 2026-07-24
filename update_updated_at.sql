-- =====================================================
-- Add updated_at column + auto-update trigger
-- Run this to enable updated_at on flora_conteos_anuales
-- =====================================================

-- Add the column (safe to run if it already exists)
ALTER TABLE public.flora_conteos_anuales
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger function: set updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger (safe to run multiple times)
DROP TRIGGER IF EXISTS trg_flora_conteos_updated_at ON public.flora_conteos_anuales;
CREATE TRIGGER trg_flora_conteos_updated_at
  BEFORE UPDATE ON public.flora_conteos_anuales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
