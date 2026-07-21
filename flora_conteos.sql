CREATE TABLE IF NOT EXISTS public.flora_conteos_anuales (
  gid SERIAL PRIMARY KEY,
  scientific character varying,
  common_nam character varying,
  year_2021 integer DEFAULT 0,
  year_2022 integer DEFAULT 0,
  year_2023 integer DEFAULT 0,
  year_2024 integer DEFAULT 0,
  year_2025 integer DEFAULT 0,
  year_2026 integer DEFAULT 0
);

ALTER TABLE public.flora_conteos_anuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON public.flora_conteos_anuales
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert" ON public.flora_conteos_anuales
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update" ON public.flora_conteos_anuales
  FOR UPDATE USING (true);

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
