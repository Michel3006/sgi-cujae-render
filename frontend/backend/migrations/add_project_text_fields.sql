-- Ejecutar una vez en PostgreSQL si la tabla project ya existe sin estas columnas
ALTER TABLE project ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS tasks TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS scientific_details TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS other_data TEXT;
