-- Agrega bandera de publicación en Zenodo para registros científicos
-- Ejecutar en pgAdmin sobre la base de datos de producción/desarrollo.

ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.norms
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.prizes
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.monographs
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.theses
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.patents
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.softwares
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;

ALTER TABLE public.encounters
ADD COLUMN IF NOT EXISTS publicated boolean NOT NULL DEFAULT false;
