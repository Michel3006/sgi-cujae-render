-- Usuarios de prueba: uno por cada rol del sistema.
-- Contraseña documentada en docs/USUARIOS_PRUEBA_ROLES.md (solo si existe columna password_hash).
-- Ejecutar: psql -d sistema_unificado_c_c_q -f bd/seed_test_users_by_role.sql

-- Opcional: columna de contraseña para login seguro
ALTER TABLE integrant ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Unicidad de user_name (evita duplicados al re-ejecutar manualmente)
CREATE UNIQUE INDEX IF NOT EXISTS integrant_user_name_unique ON integrant (user_name)
WHERE user_name IS NOT NULL;

DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN
        SELECT * FROM (VALUES
            ('test_admin',      'Usuario Prueba ADMIN',      'test_admin@cujae.test',      1, 'ADMIN'),
            ('test_usuario',    'Usuario Prueba USUARIO',    'test_usuario@cujae.test',    2, 'USUARIO'),
            ('test_consejo',    'Usuario Prueba CONSEJO',    'test_consejo@cujae.test',    3, 'CONSEJO'),
            ('test_autor',      'Usuario Prueba AUTOR',      'test_autor@cujae.test',      4, 'AUTOR'),
            ('test_publicador', 'Usuario Prueba PUBLICADOR', 'test_publicador@cujae.test', 5, 'PUBLICADOR')
        ) AS t(user_name, display_name, email, role_id, role_label)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM integrant WHERE user_name = u.user_name) THEN
            INSERT INTO integrant (name, external, email, user_name)
            VALUES (u.display_name, false, u.email, u.user_name);
        END IF;

        INSERT INTO integrant_role (id_integrant, id_role)
        SELECT i.id_integrant, u.role_id
        FROM integrant i
        WHERE i.user_name = u.user_name
          AND NOT EXISTS (
              SELECT 1 FROM integrant_role ir
              WHERE ir.id_integrant = i.id_integrant AND ir.id_role = u.role_id
          );
    END LOOP;
END $$;
