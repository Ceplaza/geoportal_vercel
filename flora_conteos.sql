-- =====================================================
-- FLORA CONTEOS ANUALES — Full Setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Main table
CREATE TABLE IF NOT EXISTS public.flora_conteos_anuales (
  gid SERIAL PRIMARY KEY,
  scientific character varying,
  common_nam character varying,
  year_2021 integer DEFAULT 0,
  year_2022 integer DEFAULT 0,
  year_2023 integer DEFAULT 0,
  year_2024 integer DEFAULT 0,
  year_2025 integer DEFAULT 0,
  year_2026 integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.flora_conteos_anuales ENABLE ROW LEVEL SECURITY;

-- Public SELECT only (chart display + modal prefill)
CREATE POLICY "Allow anon read" ON public.flora_conteos_anuales
  FOR SELECT USING (true);

-- INSERT/UPDATE only via Edge Function (service_role)

-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flora_conteos_updated_at ON public.flora_conteos_anuales;
CREATE TRIGGER trg_flora_conteos_updated_at
  BEFORE UPDATE ON public.flora_conteos_anuales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Rate limit table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'measurement',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier
  ON public.rate_limit_attempts (identifier, attempt_type, created_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_attempts FROM anon, authenticated;

-- 4. Rate limit functions
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

-- Cleanup of old rate_limit_attempts records should be handled by a scheduled task or maintenance process.

-- 5. Revoke direct write access from anon/authenticated
REVOKE INSERT, UPDATE ON public.flora_conteos_anuales FROM anon, authenticated;

-- 6. Sample data (25 species, increasing trend 2021-2025)
INSERT INTO public.flora_conteos_anuales (scientific, common_nam, year_2021, year_2022, year_2023, year_2024, year_2025) VALUES
('Jacaranda mimosifolia', 'Jacaranda sudamericana', 12, 18, 25, 34, 48),
('Passiflora manicata', 'luquón rojo', 8, 12, 17, 22, 30),
('Salvia sagittata', 'salvia hoja de flecha', 5, 9, 14, 20, 28),
('Schinus molle', 'Molle', 20, 24, 30, 38, 50),
('Epidendrum radicans', 'Estrella de fuego', 3, 6, 10, 16, 24),
('Tecoma stans', 'Cholan', 15, 20, 27, 35, 45),
('Bougainvillea', 'Bugambilias', 22, 28, 35, 42, 55),
('Fuchsia boliviana', 'aretillo de los Andes', 4, 7, 11, 17, 25),
('Cantua buxifolia', 'Cantuta', 2, 5, 8, 13, 20),
('Polylepis incana', 'Queñua', 6, 10, 15, 21, 30),
('Parajubaea cocoides', 'coco cumbi', 10, 15, 20, 27, 38),
('Strelitzia reginae', 'flor de ave del paraíso', 3, 5, 9, 14, 22),
('Erythrina edulis', 'Chachafruto', 7, 11, 16, 22, 31),
('Inga insignis', 'guabo', 18, 23, 29, 36, 47),
('Prunus serotina', 'Capulán', 14, 19, 25, 33, 44),
('Hydrangea macrophylla', 'Hortensia japonesa', 2, 4, 7, 12, 19),
('Psidium guajava', 'Guayaba dulce', 9, 13, 18, 24, 33),
('Coffea arabica', 'Cafeto', 4, 7, 11, 16, 23),
('Annona cherimola', 'Chirimoya', 11, 15, 21, 28, 38),
('Erigeron karvinskianus', 'Marimonia', 6, 10, 15, 22, 31),
('Cecropia angustifolia', 'Yarumo negro', 8, 13, 19, 26, 36),
('Tara spinosa', 'Guarango', 5, 8, 12, 18, 26),
('Feijoa sellowiana', 'Guayabo de Brasil', 3, 6, 10, 15, 22),
('Myrcianthes hallii', 'Arrayán', 16, 21, 28, 36, 48),
('Salvia elegans', 'Hierba del burro', 2, 4, 7, 11, 17);
