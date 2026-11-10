-- Migración: tabla de publicaciones Zenodo
-- Ejecutar en PostgreSQL (sistema_unificado_c_c_q)

CREATE SEQUENCE IF NOT EXISTS zenodo_publications_id_zenodo_publication_seq;

CREATE TABLE IF NOT EXISTS zenodo_publications (
    id_zenodo_publication integer DEFAULT nextval('zenodo_publications_id_zenodo_publication_seq'::regclass) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    zenodo_deposition_id character varying(50),
    zenodo_record_id character varying(50),
    zenodo_conceptrecid character varying(50),
    doi character varying(100),
    zenodo_url character varying(500),
    status character varying(20) DEFAULT 'draft' NOT NULL,
    local_file_path character varying(500),
    original_filename character varying(255),
    error_message text,
    published_by integer REFERENCES integrant(id_integrant),
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    PRIMARY KEY (id_zenodo_publication)
);

CREATE INDEX IF NOT EXISTS idx_zenodo_publications_entity
    ON zenodo_publications (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_zenodo_publications_status
    ON zenodo_publications (status);
