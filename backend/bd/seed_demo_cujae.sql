-- =============================================================================
-- Limpieza y datos de demostración — SGI CUJAE
-- Elimina registros, grupos y proyectos; conserva usuarios test + Pardo/Rivas/DISERTIC.
-- Inserta ≥20 registros científicos, 10 grupos y 10 proyectos variados.
-- Ejecutar: docker exec -i sgi-unificado psql -U postgres -d sistema_unificado_c_c_q -f - < backend/bd/seed_demo_cujae.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Usuarios a conservar
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE keep_integrants ON COMMIT DROP AS
SELECT id_integrant
FROM integrant
WHERE user_name IN (
    'test_admin', 'test_usuario', 'test_consejo', 'test_autor', 'test_publicador',
    'cedpardo', 'abalejandri', 'disertic'
)
   OR name ILIKE '%Daniel Pardo%'
   OR name ILIKE '%Alejandro Rivas%'
   OR user_name ILIKE '%disertic%'
   OR name ILIKE '%DISERTIC%';

-- ---------------------------------------------------------------------------
-- 2. Limpieza (orden respetando FK)
-- ---------------------------------------------------------------------------
DELETE FROM zenodo_publications;
DELETE FROM integrant_group_evaluation;

DELETE FROM articles_authors;
DELETE FROM books_authors;
DELETE FROM monographs_authors;
DELETE FROM norms_authors;
DELETE FROM patents_authors;
DELETE FROM softwares_authors;
DELETE FROM encounters_authors;
DELETE FROM prizes_authors;
DELETE FROM theses_authors;
DELETE FROM theses_tutors;

DELETE FROM articles;
DELETE FROM books;
DELETE FROM monographs;
DELETE FROM norms;
DELETE FROM patents;
DELETE FROM softwares;
DELETE FROM encounters;
DELETE FROM prizes;
DELETE FROM theses;

DELETE FROM research_task;
DELETE FROM expected_result;
DELETE FROM specific_objective;
DELETE FROM project_integrant;
DELETE FROM project;

DELETE FROM group_integrant;
DELETE FROM public."group";

DELETE FROM conseil_users
WHERE id_integrant NOT IN (SELECT id_integrant FROM keep_integrants);

DELETE FROM integrant_role
WHERE id_integrant NOT IN (SELECT id_integrant FROM keep_integrants);

DELETE FROM trace
WHERE id_integrant IS NOT NULL
  AND id_integrant NOT IN (SELECT id_integrant FROM keep_integrants);

DELETE FROM integrant
WHERE id_integrant NOT IN (SELECT id_integrant FROM keep_integrants);

-- ---------------------------------------------------------------------------
-- 3. Integrantes de demostración (investigadores CUJAE)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE demo_users (
    key TEXT PRIMARY KEY,
    user_name TEXT,
    display_name TEXT,
    email TEXT,
    id_faculty INT,
    external BOOLEAN DEFAULT FALSE
) ON COMMIT DROP;

INSERT INTO demo_users (key, user_name, display_name, email, id_faculty) VALUES
    ('mgonzalez', 'demo_mgonzalez', 'María González López',       'mgonzalez@inst.cujae.edu.cu',      6),
    ('chernandez','demo_chernandez','Carlos Hernández Ruiz',     'chernandez@inst.cujae.edu.cu',    3),
    ('lramos',    'demo_lramos',    'Laura Ramos Vega',          'lramos@inst.cujae.edu.cu',       2),
    ('jmartinez', 'demo_jmartinez', 'José Martínez Díaz',        'jmartinez@inst.cujae.edu.cu',    4),
    ('eperez',    'demo_eperez',    'Elena Pérez Castro',         'eperez@inst.cujae.edu.cu',       7),
    ('rfernandez','demo_rfernandez','Roberto Fernández Ortiz',   'rfernandez@inst.cujae.edu.cu',  17),
    ('smorales',  'demo_smorales',  'Sandra Morales Lima',       'smorales@inst.cujae.edu.cu',    18),
    ('mvega',     'demo_mvega',     'Miguel Vega Herrera',       'mvega@inst.cujae.edu.cu',        5),
    ('acastro',   'demo_acastro',   'Ana Castro Blanco',         'acastro@inst.cujae.edu.cu',     15),
    ('otorres',   'demo_otorres',   'Oscar Torres Gil',          'otorres@inst.cujae.edu.cu',      6),
    ('vgomez',    'demo_vgomez',    'Verónica Gómez Núñez',      'vgomez@inst.cujae.edu.cu',       3),
    ('hsilva',    'demo_hsilva',    'Hernán Silva Reyes',        'hsilva@inst.cujae.edu.cu',       1);

INSERT INTO integrant (name, identity, external, email, phone, available_time, work_center, id_faculty, id_country, id_cientific_degree, id_docent_degree, user_name)
SELECT
    d.display_name,
    '9' || LPAD((90000000 + ROW_NUMBER() OVER (ORDER BY d.key))::TEXT, 8, '0'),
    d.external,
    d.email,
    '+53 7 266 ' || LPAD((1000 + ROW_NUMBER() OVER (ORDER BY d.key))::TEXT, 4, '0'),
    40,
    'CUJAE',
    d.id_faculty,
    51,
    15,
    1,
    d.user_name
FROM demo_users d;

INSERT INTO integrant_role (id_integrant, id_role)
SELECT i.id_integrant, 2
FROM integrant i
JOIN demo_users d ON d.user_name = i.user_name
WHERE NOT EXISTS (
    SELECT 1 FROM integrant_role ir
    WHERE ir.id_integrant = i.id_integrant AND ir.id_role = 2
);

CREATE TEMP TABLE seed_ids (key TEXT PRIMARY KEY, int_id INT) ON COMMIT DROP;

INSERT INTO seed_ids (key, int_id)
SELECT d.key, i.id_integrant
FROM demo_users d
JOIN integrant i ON i.user_name = d.user_name;

INSERT INTO seed_ids (key, int_id) VALUES
    ('test_admin',      (SELECT id_integrant FROM integrant WHERE user_name = 'test_admin')),
    ('test_consejo',    (SELECT id_integrant FROM integrant WHERE user_name = 'test_consejo')),
    ('test_autor',      (SELECT id_integrant FROM integrant WHERE user_name = 'test_autor')),
    ('test_publicador', (SELECT id_integrant FROM integrant WHERE user_name = 'test_publicador')),
    ('pardo',           (SELECT id_integrant FROM integrant WHERE user_name = 'cedpardo')),
    ('rivas',           (SELECT id_integrant FROM integrant WHERE user_name = 'abalejandri')),
    ('disertic',        (SELECT id_integrant FROM integrant WHERE user_name = 'disertic'))
ON CONFLICT (key) DO UPDATE SET int_id = EXCLUDED.int_id;

-- ---------------------------------------------------------------------------
-- 4. Grupos de investigación (10)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_groups (key TEXT PRIMARY KEY, int_id INT) ON COMMIT DROP;

WITH inserted AS (
    INSERT INTO public."group" (name, subjects, problems, id_faculty_area, id_admin, id_faculty, create_date, update_date)
    VALUES
    (
        'GIACIA — Inteligencia Artificial y Ciencia de Datos',
        'Aprendizaje automático, visión por computadora, procesamiento de lenguaje natural, analítica de datos',
        'Escasez de soluciones de IA adaptadas al contexto industrial cubano y a datos limitados',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'rivas'),
        6,
        NOW(), NOW()
    ),
    (
        'GIEST — Ingeniería Estructural y Tecnología del Hormigón',
        'Estructuras de hormigón, materiales compuestos, durabilidad, patología estructural',
        'Envejecimiento de infraestructuras y necesidad de materiales sostenibles en la construcción cubana',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'pardo'),
        3,
        NOW(), NOW()
    ),
    (
        'GIER — Innovación en Energías Renovables',
        'Energía solar fotovoltaica, eficiencia energética, sistemas híbridos, almacenamiento',
        'Dependencia energética y transición hacia fuentes renovables en instalaciones industriales',
        1,
        (SELECT int_id FROM seed_ids WHERE key = 'test_consejo'),
        2,
        NOW(), NOW()
    ),
    (
        'GIMEC — Mecánica y Materiales Avanzados',
        'Materiales metálicos, tribología, diseño mecánico, manufactura aditiva',
        'Falta de componentes mecánicos de alto rendimiento producidos localmente',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'jmartinez'),
        4,
        NOW(), NOW()
    ),
    (
        'GIRC — Redes, Cómputo y Ciberseguridad',
        'Redes de datos, computación distribuida, seguridad informática, IoT industrial',
        'Vulnerabilidades en infraestructuras críticas y necesidad de redes resilientes',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'mgonzalez'),
        6,
        NOW(), NOW()
    ),
    (
        'GIQV — Química Verde y Procesos Sostenibles',
        'Catálisis, tratamiento de aguas residuales, química de polímeros, bioprocesos',
        'Contaminación industrial y búsqueda de procesos químicos más limpios',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'disertic'),
        7,
        NOW(), NOW()
    ),
    (
        'GIAUTO — Automatización y Control Industrial',
        'Control de procesos, robótica, instrumentación, sistemas SCADA',
        'Baja automatización en plantas industriales cubanas y obsolescencia tecnológica',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'smorales'),
        18,
        NOW(), NOW()
    ),
    (
        'GITEL — Telecomunicaciones y Sistemas Embebidos',
        'Comunicaciones inalámbricas, 5G, sistemas embebidos, señales digitales',
        'Conectividad limitada y necesidad de soluciones de telecomunicaciones nacionales',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'rfernandez'),
        17,
        NOW(), NOW()
    ),
    (
        'GIHID — Hidráulica y Gestión de Recursos Hídricos',
        'Hidráulica fluvial, diseño de presas, gestión de cuencas, ingeniería costera',
        'Estrés hídrico y vulnerabilidad costera ante el cambio climático',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'chernandez'),
        3,
        NOW(), NOW()
    ),
    (
        'GIECO — Economía Circular y Desarrollo Sostenible',
        'Economía circular, indicadores de sostenibilidad, gestión ambiental, políticas públicas',
        'Bajo aprovechamiento de residuos industriales y falta de modelos circulares',
        NULL,
        (SELECT int_id FROM seed_ids WHERE key = 'test_admin'),
        15,
        NOW(), NOW()
    )
    RETURNING id_group, name
)
INSERT INTO seed_groups (key, int_id)
SELECT v.key, i.id_group
FROM (VALUES
    ('giacia', 'GIACIA'),
    ('giest',  'GIEST'),
    ('gier',   'GIER'),
    ('gimec',  'GIMEC'),
    ('girc',   'GIRC'),
    ('giqv',   'GIQV'),
    ('giauto', 'GIAUTO'),
    ('gitel',  'GITEL'),
    ('gihid',  'GIHID'),
    ('gieco',  'GIECO')
) AS v(key, prefix)
JOIN inserted i ON i.name LIKE v.prefix || '%';

-- Miembros de grupos (líder + varios integrantes)
INSERT INTO group_integrant (id_group, id_integrant, admin)
SELECT g.int_id, s.int_id, m.is_admin
FROM seed_groups g
JOIN (VALUES
    ('giacia', 'rivas',       TRUE),
    ('giacia', 'mgonzalez',   FALSE),
    ('giacia', 'otorres',     FALSE),
    ('giacia', 'test_autor',  FALSE),
    ('giacia', 'smorales',    FALSE),

    ('giest',  'pardo',       TRUE),
    ('giest',  'chernandez',  FALSE),
    ('giest',  'vgomez',      FALSE),
    ('giest',  'mvega',       FALSE),
    ('giest',  'test_consejo',FALSE),

    ('gier',   'test_consejo',TRUE),
    ('gier',   'lramos',      FALSE),
    ('gier',   'rfernandez',  FALSE),
    ('gier',   'hsilva',      FALSE),

    ('gimec',  'jmartinez',   TRUE),
    ('gimec',  'hsilva',      FALSE),
    ('gimec',  'smorales',    FALSE),
    ('gimec',  'pardo',       FALSE),

    ('girc',   'mgonzalez',   TRUE),
    ('girc',   'otorres',     FALSE),
    ('girc',   'rivas',       FALSE),
    ('girc',   'test_admin',  FALSE),

    ('giqv',   'disertic',    TRUE),
    ('giqv',   'eperez',      FALSE),
    ('giqv',   'acastro',     FALSE),
    ('giqv',   'test_publicador', FALSE),

    ('giauto', 'smorales',    TRUE),
    ('giauto', 'rivas',       FALSE),
    ('giauto', 'rfernandez',  FALSE),
    ('giauto', 'jmartinez',   FALSE),

    ('gitel',  'rfernandez',  TRUE),
    ('gitel',  'lramos',      FALSE),
    ('gitel',  'mgonzalez',   FALSE),
    ('gitel',  'otorres',     FALSE),

    ('gihid',  'chernandez',  TRUE),
    ('gihid',  'vgomez',      FALSE),
    ('gihid',  'pardo',       FALSE),
    ('gihid',  'mvega',       FALSE),

    ('gieco',  'test_admin',  TRUE),
    ('gieco',  'acastro',     FALSE),
    ('gieco',  'eperez',      FALSE),
    ('gieco',  'disertic',    FALSE)
) AS m(group_key, user_key, is_admin) ON m.group_key = g.key
JOIN seed_ids s ON s.key = m.user_key;

-- ---------------------------------------------------------------------------
-- 5. Proyectos (10) — tipos, estados y alcances variados
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_projects (key TEXT PRIMARY KEY, int_id INT) ON COMMIT DROP;

WITH inserted AS (
    INSERT INTO project (
        title, code, id_responsible, thematic, id_project_type, art_state,
        cientific_problem, study_object, study_field, hypothesis, main_objective,
        research_methods, interested_third_party, national_group, international_group,
        publish_magazine, participate_events, citma_code, minvec_code,
        approved, conseil_criteria, initial_date, final_date, update_date,
        id_project_state, id_project_classification, economic_budget, economic_needs,
        id_faculty, concluded, approved_date,
        general_budget_cup, year_budget_cup,
        is_international, is_national, is_territorial, is_cujae, keywords
    )
    VALUES
    (
        'Sistema inteligente de diagnóstico de fallas en redes eléctricas industriales',
        'CUJAE-PAP-2024-001',
        (SELECT int_id FROM seed_ids WHERE key = 'rivas'),
        'Inteligencia artificial aplicada a sistemas eléctricos',
        1, 'Desarrollo de prototipo funcional',
        'Altas pérdidas por fallas no detectadas a tiempo en subestaciones industriales',
        'Redes de distribución eléctrica industrial',
        'Ingeniería eléctrica e inteligencia artificial',
        'Los modelos de aprendizaje profundo permiten anticipar fallas con mayor precisión que métodos tradicionales',
        'Diseñar e implementar un sistema de diagnóstico predictivo para redes eléctricas de la industria cubana',
        'Simulación, adquisición de datos, entrenamiento de redes neuronales, validación en planta piloto',
        'UNE, empresas eléctricas estatales',
        'GIACIA, GIER',
        'Red Iberoamericana de Energía',
        'Revista Ingeniería Eléctrica CUJAE',
        'Convención CIGRE, Foro de Energía Cuba',
        'CITMA-2024-EL-001', 'MINVEC-24-001',
        TRUE, 'Aprobado por consejo científico de Facultad de Automática',
        '2024-01-15', '2026-12-31', CURRENT_DATE,
        2, 1,
        'Financiamiento institucional CUJAE', 'Equipamiento de adquisición de datos y GPUs',
        18, FALSE, '2024-02-01',
        850000.00, 320000.00,
        FALSE, TRUE, FALSE, TRUE,
        'IA, redes eléctricas, diagnóstico, CUJAE'
    ),
    (
        'Hormigón reforzado con fibras naturales para viviendas rurales',
        'CUJAE-PNAP-2024-002',
        (SELECT int_id FROM seed_ids WHERE key = 'pardo'),
        'Materiales de construcción sostenibles',
        2, 'Ensayos de laboratorio en curso',
        'Escasez de acero e impacto ambiental del hormigón convencional en vivienda rural',
        'Mezclas de hormigón con fibras de origen vegetal',
        'Ingeniería civil y materiales',
        'Las fibras naturales mejoran la ductilidad sin comprometer la resistencia a compresión',
        'Evaluar el comportamiento mecánico y durabilidad del hormigón fibrado con materias primas locales',
        'Ensayos destructivos, microscopía, modelación numérica FEM',
        'MICONS, empresas constructoras locales',
        'GIEST',
        '',
        'Revista Ingeniería Civil',
        'Congreso Latinoamericano de Ingeniería Estructural',
        'CITMA-2024-CIV-002', '',
        TRUE, 'Prioridad territorial Matanzas',
        '2023-09-01', '2025-08-31', CURRENT_DATE,
        2, 3,
        'Proyecto territorial', 'Laboratorio de materiales',
        3, FALSE, '2023-10-15',
        420000.00, 180000.00,
        FALSE, TRUE, TRUE, TRUE,
        'hormigón, fibras naturales, construcción sostenible'
    ),
    (
        'Robot colaborativo para soldadura en líneas de montaje automotriz',
        'CUJAE-EMP-2023-003',
        (SELECT int_id FROM seed_ids WHERE key = 'jmartinez'),
        'Robótica industrial',
        3, 'Integración con PLC en planta',
        'Baja productividad y riesgos ergonómicos en soldadura manual',
        'Células robotizadas de soldadura MIG/MAG',
        'Ingeniería mecánica y automatización',
        'La colaboración humano-robot aumenta la precisión y reduce tiempos de ciclo',
        'Desarrollar un brazo robot colaborativo adaptado a condiciones de talleres cubanos',
        'Diseño mecánico, programación offline, pruebas de seguridad ISO 10218',
        'Empresa automotriz nacional',
        'GIMEC, GIAUTO',
        'Red GRIPI',
        'Ingeniería Mecánica',
        'Expociencia Habana',
        '', 'MINVEC-23-045',
        TRUE, 'Vinculado a programa empresarial',
        '2023-03-01', '2025-02-28', CURRENT_DATE,
        1, 2,
        'Cofinanciamiento empresarial', 'Robot industrial y sensores de fuerza',
        4, FALSE, '2023-04-01',
        1200000.00, 450000.00,
        FALSE, TRUE, FALSE, TRUE,
        'robotica, soldadura, industria'
    ),
    (
        'Catálisis verde para tratamiento de efluentes textiles',
        'CUJAE-INST-2022-004',
        (SELECT int_id FROM seed_ids WHERE key = 'disertic'),
        'Química ambiental',
        4, 'Escalado a piloto industrial',
        'Contaminación por colorantes en efluentes de la industria textil',
        'Procesos de oxidación avanzada con catalizadores heterogéneos',
        'Ingeniería química',
        'Los catalizadores basados en óxidos mixtos degradan colorantes con alta eficiencia',
        'Sintetizar y validar catalizadores reutilizables para tratamiento de aguas industriales',
        'Síntesis química, caracterización XRD/SEM, ensayos de degradación',
        'Combinado textil, CITMA',
        'GIQV',
        'UNESCO Water Alliance',
        'Química Industrial',
        'Simposio Iberoamericano de Química Verde',
        'CITMA-2022-QM-004', 'MINVEC-22-112',
        TRUE, 'Impacto ambiental demostrado',
        '2022-06-01', '2024-05-31', CURRENT_DATE,
        3, 1,
        'Proyecto institucional concluido', 'Reactor piloto',
        7, TRUE, '2022-07-01',
        680000.00, 0.00,
        TRUE, TRUE, FALSE, TRUE,
        'catálisis, aguas residuales, química verde'
    ),
    (
        'Dispositivos biomédicos de monitoreo no invasivo de signos vitales',
        'CUJAE-PAP-2024-005',
        (SELECT int_id FROM seed_ids WHERE key = 'smorales'),
        'Ingeniería biomédica',
        1, 'Validación clínica preliminar',
        'Escasez de equipos de monitoreo portátiles en centros de salud',
        'Sensores ópticos y de presión para monitoreo continuo',
        'Automática y ciencias biomédicas',
        'La fusión de señales multimodal mejora la detección de eventos críticos',
        'Prototipar un dispositivo wearable de bajo costo para hospitales cubanos',
        'Diseño electrónico, adquisición de señales, pruebas con voluntarios',
        'MINSAP, hospital clínico docente',
        'GIAUTO',
        'IEEE EMBS',
        'Revista Médica Cubana',
        'Congreso de Ingeniería Biomédica',
        'CITMA-2024-BIO-005', '',
        FALSE, 'Pendiente de aprobación final del consejo',
        '2024-04-01', '2027-03-31', CURRENT_DATE,
        4, 2,
        'Solicitud de financiamiento', 'Sensores y equipos biomédicos',
        18, FALSE, NULL,
        550000.00, 210000.00,
        TRUE, TRUE, FALSE, TRUE,
        'biomédica, sensores, salud'
    ),
    (
        'Microred inteligente con integración solar fotovoltaica',
        'CUJAE-PNAP-2024-006',
        (SELECT int_id FROM seed_ids WHERE key = 'lramos'),
        'Sistemas eléctricos de potencia',
        2, 'Modelación y simulación',
        'Inestabilidad de la red ante penetración de renovables',
        'Microredes campus CUJAE',
        'Ingeniería eléctrica',
        'El control predictivo estabiliza la microred ante perturbaciones',
        'Diseñar estrategias de gestión energética para microred con FV y almacenamiento',
        'Modelación en MATLAB/Simulink, pruebas hardware-in-the-loop',
        'UNE, Oficina de Ahorro Energético',
        'GIER',
        'Microgrid Institute',
        'Energética',
        'Conferencia IEEE PES',
        'CITMA-2024-EL-006', '',
        TRUE, 'Alineado al plan de eficiencia energética',
        '2024-02-01', '2026-01-31', CURRENT_DATE,
        2, 3,
        'Financiamiento FCT', 'Banco de baterías y inversores',
        2, FALSE, '2024-03-01',
        720000.00, 280000.00,
        FALSE, TRUE, FALSE, TRUE,
        'microred, fotovoltaica, eficiencia'
    ),
    (
        'Plataforma blockchain para trazabilidad de insumos agrícolas',
        'CUJAE-PAP-2023-007',
        (SELECT int_id FROM seed_ids WHERE key = 'mgonzalez'),
        'Tecnologías de la información',
        1, 'Despliegue piloto en cooperativa',
        'Falta de trazabilidad en la cadena de valor agroalimentaria',
        'Registros distribuidos en cadena de suministro',
        'Informática y agronomía',
        'Blockchain mejora la confianza y reduce pérdidas por falsificación',
        'Implementar prototipo de trazabilidad para cooperativas agropecuarias',
        'Desarrollo de smart contracts, app móvil, pruebas de campo',
        'MINAG, cooperativas piloto',
        'GIRC',
        '',
        'Revista Cubana de Ciencias Informáticas',
        'Convención Informática',
        'CITMA-2023-INF-007', 'MINVEC-23-078',
        TRUE, 'Proyecto vinculado a agricultura',
        '2023-07-01', '2025-06-30', CURRENT_DATE,
        2, 1,
        'Fondo de innovación', 'Servidores y nodos edge',
        6, FALSE, '2023-08-01',
        390000.00, 150000.00,
        FALSE, TRUE, TRUE, TRUE,
        'blockchain, agricultura, trazabilidad'
    ),
    (
        'Red IoT para monitoreo de cultivos en tiempo real',
        'CUJAE-EMP-2024-008',
        (SELECT int_id FROM seed_ids WHERE key = 'rfernandez'),
        'Internet de las cosas',
        3, 'Despliegue de sensores en campo',
        'Pérdidas de rendimiento por falta de monitoreo climático y de suelo',
        'Redes de sensores agrícolas de bajo consumo',
        'Telecomunicaciones y agricultura de precisión',
        'La agregación de datos IoT permite decisiones de riego más eficientes',
        'Desplegar red LoRaWAN para monitoreo de cultivos en fincas piloto',
        'Diseño de hardware, protocolos LPWAN, análisis de datos',
        'Empresa agropecuaria estatal',
        'GITEL',
        'LoRa Alliance',
        'Telecomunicaciones',
        'Feria de la Ciencia',
        '', 'MINVEC-24-033',
        TRUE, 'Demanda empresarial directa',
        '2024-01-01', '2025-12-31', CURRENT_DATE,
        2, 2,
        'Contrato empresarial', 'Gateways y sensores',
        17, FALSE, '2024-01-20',
        510000.00, 200000.00,
        FALSE, TRUE, TRUE, TRUE,
        'IoT, agricultura, LoRaWAN'
    ),
    (
        'Plan maestro de adaptación costera para municipios de Mayabeque',
        'CUJAE-INST-2024-009',
        (SELECT int_id FROM seed_ids WHERE key = 'mvega'),
        'Urbanismo sostenible',
        4, 'Elaboración de documentos técnicos',
        'Vulnerabilidad de asentamientos costeros ante inundaciones',
        'Zonas costeras del litoral sur de Mayabeque',
        'Arquitectura y urbanismo',
        'La combinación de infraestructura verde y ordenamiento reduce el riesgo',
        'Elaborar lineamientos de adaptación costera con enfoque participativo',
        'Cartografía, modelación inundaciones, talleres con comunidad',
        'Gobierno municipal, CITMA territorial',
        'GIHID',
        'UN-Habitat',
        'Arquitectura y Urbanismo',
        'Congreso de Arquitectura Tropical',
        'CITMA-2024-ARQ-009', '',
        FALSE, 'En formulación — revisión de consejo pendiente',
        '2024-05-01', '2026-04-30', CURRENT_DATE,
        5, 3,
        'Sin financiamiento aprobado aún', 'Software GIS y levantamientos',
        5, FALSE, NULL,
        0.00, 0.00,
        TRUE, TRUE, TRUE, TRUE,
        'costas, urbanismo, cambio climático'
    ),
    (
        'Evaluación sísmica de edificios escolares de La Habana',
        'CUJAE-PAP-2021-010',
        (SELECT int_id FROM seed_ids WHERE key = 'pardo'),
        'Ingeniería sísmica',
        1, 'Informe final entregado',
        'Riesgo sísmico en edificaciones educativas pre-1980',
        'Edificios escolares de la capital',
        'Ingeniería estructural',
        'Los refuerzos localizados mejoran la respuesta sísmica sin demolición total',
        'Evaluar vulnerabilidad y proponer refuerzos para escuelas prioritarias',
        'Inspección visual, análisis pushover, propuestas de refuerzo',
        'MINED, MICONS',
        'GIEST, GIHID',
        'IASPEI',
        'Revista Ingeniería Civil',
        'Congreso Panamericano de Ingeniería Sísmica',
        'CITMA-2021-CIV-010', 'MINVEC-21-201',
        TRUE, 'Proyecto concluido con impacto social',
        '2021-01-01', '2023-12-31', CURRENT_DATE,
        3, 3,
        'Proyecto concluido', 'N/A',
        3, TRUE, '2021-02-01',
        890000.00, 0.00,
        FALSE, TRUE, FALSE, TRUE,
        'sismo, escuelas, estructuras'
    )
    RETURNING id_project, code
)
INSERT INTO seed_projects (key, int_id)
SELECT v.key, i.id_project
FROM (VALUES
    ('p01', 'CUJAE-PAP-2024-001'),
    ('p02', 'CUJAE-PNAP-2024-002'),
    ('p03', 'CUJAE-EMP-2023-003'),
    ('p04', 'CUJAE-INST-2022-004'),
    ('p05', 'CUJAE-PAP-2024-005'),
    ('p06', 'CUJAE-PNAP-2024-006'),
    ('p07', 'CUJAE-PAP-2023-007'),
    ('p08', 'CUJAE-EMP-2024-008'),
    ('p09', 'CUJAE-INST-2024-009'),
    ('p10', 'CUJAE-PAP-2021-010')
) AS v(key, code)
JOIN inserted i ON i.code = v.code;

-- Integrantes de proyectos
INSERT INTO project_integrant (id_project, id_integrant, admin)
SELECT p.int_id, s.int_id, x.is_admin
FROM seed_projects p
JOIN (VALUES
    ('p01', 'rivas',       TRUE),
    ('p01', 'lramos',      FALSE),
    ('p01', 'mgonzalez',   FALSE),
    ('p01', 'test_consejo',FALSE),

    ('p02', 'pardo',       TRUE),
    ('p02', 'chernandez',  FALSE),
    ('p02', 'vgomez',      FALSE),
    ('p02', 'mvega',       FALSE),

    ('p03', 'jmartinez',   TRUE),
    ('p03', 'smorales',    FALSE),
    ('p03', 'hsilva',      FALSE),

    ('p04', 'disertic',    TRUE),
    ('p04', 'eperez',      FALSE),
    ('p04', 'acastro',     FALSE),

    ('p05', 'smorales',    TRUE),
    ('p05', 'rivas',       FALSE),
    ('p05', 'rfernandez',  FALSE),

    ('p06', 'lramos',      TRUE),
    ('p06', 'rfernandez',  FALSE),
    ('p06', 'test_admin',  FALSE),

    ('p07', 'mgonzalez',   TRUE),
    ('p07', 'otorres',     FALSE),
    ('p07', 'test_autor',  FALSE),

    ('p08', 'rfernandez',  TRUE),
    ('p08', 'otorres',     FALSE),
    ('p08', 'lramos',      FALSE),

    ('p09', 'mvega',       TRUE),
    ('p09', 'chernandez',  FALSE),
    ('p09', 'acastro',     FALSE),

    ('p10', 'pardo',       TRUE),
    ('p10', 'chernandez',  FALSE),
    ('p10', 'vgomez',      FALSE),
    ('p10', 'test_publicador', FALSE)
) AS x(proj_key, user_key, is_admin) ON x.proj_key = p.key
JOIN seed_ids s ON s.key = x.user_key;

-- Objetivos específicos y tareas (demostración de gestión)
INSERT INTO specific_objective (name, description, id_project, sort_order)
SELECT v.name, v.description, p.int_id, v.sort_order
FROM seed_projects p
JOIN (VALUES
    ('p01', 1, 'OE1', 'Adquirir datos de operación de subestaciones'),
    ('p01', 2, 'OE2', 'Entrenar modelos de detección de anomalías'),
    ('p02', 1, 'OE1', 'Caracterizar fibras naturales cubanas'),
    ('p02', 2, 'OE2', 'Formular mezclas de hormigón fibrado'),
    ('p07', 1, 'OE1', 'Diseñar arquitectura blockchain'),
    ('p07', 2, 'OE2', 'Desplegar piloto en cooperativa')
) AS v(proj_key, sort_order, name, description) ON v.proj_key = p.key;

INSERT INTO research_task (name, description, id_responsible, initial_date, final_date, id_project, sort_order, id_research_task_state, remote_task, estimation_time)
SELECT v.name, v.description, s.int_id, v.initial_date::date, v.final_date::date, p.int_id, v.sort_order, v.state_id, v.remote, v.hours
FROM seed_projects p
JOIN (VALUES
    ('p01', 'rivas',       'Instalación de sensores', 'Montaje de sensores en subestación piloto', '2024-02-01', '2024-08-31', 1, 3, FALSE, 320),
    ('p01', 'mgonzalez',   'Entrenamiento del modelo', 'Pipeline de ML para detección de fallas', '2024-06-01', '2025-06-30', 2, 4, FALSE, 480),
    ('p03', 'jmartinez',   'Diseño mecánico', 'CAD del brazo robot colaborativo', '2023-04-01', '2023-12-31', 1, 3, FALSE, 400),
    ('p07', 'otorres',     'Desarrollo backend', 'API y nodos blockchain', '2023-09-01', '2024-06-30', 2, 4, TRUE, 360)
) AS v(proj_key, user_key, name, description, initial_date, final_date, sort_order, state_id, remote, hours) ON v.proj_key = p.key
JOIN seed_ids s ON s.key = v.user_key;

-- ---------------------------------------------------------------------------
-- 6. Registros científicos (22) — todos los tipos representados
-- ---------------------------------------------------------------------------

-- Artículos (3)
WITH a AS (
    INSERT INTO articles (title, journal, voulume, pages, number, keywords, doi, resume, id_article_type, report_date, issn, id_country, month_only, year_only, id_project, id_group, published, publicated)
    VALUES
    (
        'Deep learning para diagnóstico de fallas en transformadores de distribución',
        'Ingeniería Eléctrica', '42', '15-28', '1',
        'deep learning, transformadores, diagnóstico, CUJAE',
        '10.1234/ie.cujae.2024.001',
        'Artículo que propone un modelo de redes neuronales convolucionales para detectar fallas incipientes en transformadores de distribución industrial.',
        1, '2024-03-15', '1815-5928', 51, 3, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p01'),
        (SELECT int_id FROM seed_groups WHERE key = 'giacia'),
        TRUE, FALSE
    ),
    (
        'Modelación numérica de vigas de hormigón fibrado con fibras de coco',
        'Revista Ingeniería Civil', '38', '45-62', '2',
        'hormigón fibrado, fibras naturales, FEM, construcción',
        '10.1234/ric.cujae.2023.018',
        'Se presenta un modelo FEM calibrado con ensayos experimentales de vigas reforzadas con fibras de coco.',
        1, '2023-11-20', '1680-0338', 51, 11, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p02'),
        (SELECT int_id FROM seed_groups WHERE key = 'giest'),
        TRUE, TRUE
    ),
    (
        'Arquitectura blockchain para trazabilidad agroalimentaria en Cuba',
        'Revista Cubana de Ciencias Informáticas', '15', '78-95', '3',
        'blockchain, trazabilidad, agricultura, smart contracts',
        '10.1234/rcci.cujae.2024.007',
        'Diseño e implementación de una plataforma blockchain para seguimiento de insumos agrícolas.',
        1, '2024-06-10', '2227-1891', 51, 6, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p07'),
        (SELECT int_id FROM seed_groups WHERE key = 'girc'),
        TRUE, FALSE
    )
    RETURNING id_article, title
)
INSERT INTO articles_authors (id_article, id_author)
SELECT a.id_article, s.int_id
FROM a
JOIN (VALUES
    ('Deep learning para diagnóstico de fallas en transformadores de distribución', 'rivas'),
    ('Deep learning para diagnóstico de fallas en transformadores de distribución', 'lramos'),
    ('Deep learning para diagnóstico de fallas en transformadores de distribución', 'test_autor'),
    ('Modelación numérica de vigas de hormigón fibrado con fibras de coco', 'pardo'),
    ('Modelación numérica de vigas de hormigón fibrado con fibras de coco', 'chernandez'),
    ('Arquitectura blockchain para trazabilidad agroalimentaria en Cuba', 'mgonzalez'),
    ('Arquitectura blockchain para trazabilidad agroalimentaria en Cuba', 'otorres')
) AS m(title, user_key) ON m.title = a.title
JOIN seed_ids s ON s.key = m.user_key;

-- Libros (2)
WITH b AS (
    INSERT INTO books (title, chapter_title, editor, voulume, number, series, pages, publisher, keywords, resume, isbn, report_date, id_country, is_chapter, month_only, year_only, id_project, id_group, publicated)
    VALUES
    (
        'Automatización de procesos industriales en la industria cubana',
        'Capítulo 5: Control avanzado de procesos',
        'Sandra Morales Lima', '1', '1', 'Ingeniería CUJAE', '112-145',
        'Editorial Universitaria CUJAE',
        'automatización, control, industria, CUJAE',
        'Obra colectiva sobre automatización industrial con capítulos de docentes CUJAE.',
        '978-959-261-500-1', '2023-05-10', 51, TRUE, 5, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p03'),
        (SELECT int_id FROM seed_groups WHERE key = 'giauto'),
        FALSE
    ),
    (
        'Energías renovables y eficiencia en el Caribe',
        'Texto completo',
        'Laura Ramos Vega', '2', '', 'Ciencias Técnicas', '1-280',
        'Editorial Científico-Técnica',
        'energía solar, eficiencia, Caribe, renovables',
        'Libro de texto sobre integración de energías renovables en contextos insulares.',
        '978-959-05-500-2', '2022-09-01', 51, FALSE, 9, 2022,
        (SELECT int_id FROM seed_projects WHERE key = 'p06'),
        (SELECT int_id FROM seed_groups WHERE key = 'gier'),
        TRUE
    )
    RETURNING id_book, title
)
INSERT INTO books_authors (id_book, id_author)
SELECT b.id_book, s.int_id
FROM b
JOIN (VALUES
    ('Automatización de procesos industriales en la industria cubana', 'smorales'),
    ('Automatización de procesos industriales en la industria cubana', 'rivas'),
    ('Energías renovables y eficiencia en el Caribe', 'lramos'),
    ('Energías renovables y eficiencia en el Caribe', 'test_publicador')
) AS m(title, user_key) ON m.title = b.title
JOIN seed_ids s ON s.key = m.user_key;

-- Monografías (2)
WITH m AS (
    INSERT INTO monographs (title, isbn, pages, number, month, keywords, resume, cenda, report_date, month_only, year_only, id_country, id_project, id_group, publicated)
    VALUES
    (
        'Diseño hidráulico de sistemas de riego por goteo en zonas costeras',
        '978-959-261-600-3', '156', '1', 'marzo',
        'riego, hidráulica, costas, agricultura',
        'Monografía técnica sobre diseño de riego eficiente en suelos salinos.',
        'CENDA-M-2024-01', '2024-02-20', 2, 2024, 51,
        (SELECT int_id FROM seed_projects WHERE key = 'p08'),
        (SELECT int_id FROM seed_groups WHERE key = 'gihid'),
        FALSE
    ),
    (
        'Metodología de evaluación de vulnerabilidad sísmica en edificios escolares',
        '978-959-261-600-4', '198', '2', 'octubre',
        'sismo, vulnerabilidad, escuelas, evaluación',
        'Guía metodológica para inspección y clasificación sísmica de escuelas.',
        'CENDA-M-2021-02', '2021-10-15', 10, 2021, 51,
        (SELECT int_id FROM seed_projects WHERE key = 'p10'),
        (SELECT int_id FROM seed_groups WHERE key = 'giest'),
        FALSE
    )
    RETURNING id_monograph, title
)
INSERT INTO monographs_authors (id_monograph, id_author)
SELECT m.id_monograph, s.int_id
FROM m
JOIN (VALUES
    ('Diseño hidráulico de sistemas de riego por goteo en zonas costeras', 'chernandez'),
    ('Diseño hidráulico de sistemas de riego por goteo en zonas costeras', 'vgomez'),
    ('Metodología de evaluación de vulnerabilidad sísmica en edificios escolares', 'pardo'),
    ('Metodología de evaluación de vulnerabilidad sísmica en edificios escolares', 'vgomez')
) AS x(title, user_key) ON x.title = m.title
JOIN seed_ids s ON s.key = x.user_key;

-- Normas (2)
WITH n AS (
    INSERT INTO norms (title, registration_number, pages, keywords, resume, id_norm_type, report_date, id_country, month_only, year_only, id_project, id_group, publicated)
    VALUES
    (
        'NC 1234:2023 — Instalaciones eléctricas en entornos industriales',
        'NC-1234-2023', '48',
        'norma cubana, instalaciones eléctricas, seguridad',
        'Norma cubana que establece requisitos para instalaciones eléctricas industriales de baja y media tensión.',
        1, '2023-12-01', 51, 12, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p01'),
        (SELECT int_id FROM seed_groups WHERE key = 'gier'),
        FALSE
    ),
    (
        'Procedimiento institucional CUJAE para gestión de proyectos de investigación',
        'CUJAE-PI-2024-01', '32',
        'gestión, investigación, procedimiento, CUJAE',
        'Documento normativo interno de la CUJAE para formulación y seguimiento de proyectos.',
        1, '2024-01-10', 51, 1, 2024,
        NULL, NULL,
        FALSE
    )
    RETURNING id_norm, title
)
INSERT INTO norms_authors (id_norm, id_author)
SELECT n.id_norm, s.int_id
FROM n
JOIN (VALUES
    ('NC 1234:2023 — Instalaciones eléctricas en entornos industriales', 'lramos'),
    ('NC 1234:2023 — Instalaciones eléctricas en entornos industriales', 'test_consejo'),
    ('Procedimiento institucional CUJAE para gestión de proyectos de investigación', 'disertic'),
    ('Procedimiento institucional CUJAE para gestión de proyectos de investigación', 'test_admin')
) AS x(title, user_key) ON x.title = n.title
JOIN seed_ids s ON s.key = x.user_key;

-- Patentes (2)
WITH pat AS (
    INSERT INTO patents (title, reg_number, yearfiled, language, assignee, monthfield, keywords, resume, report_date, month_only, year_only, id_country, is_conceded, id_project, id_group, publicated)
    VALUES
    (
        'Dispositivo de tratamiento electroquímico de aguas residuales textiles',
        'CU-2023-0045', '2023', 'ES', 'Universidad Tecnológica José Antonio Echeverría',
        'junio', 'patente, aguas residuales, electroquímica',
        'Solicitud de patente por dispositivo modular de tratamiento de efluentes textiles.',
        '2023-06-20', 6, 2023, 51, FALSE,
        (SELECT int_id FROM seed_projects WHERE key = 'p04'),
        (SELECT int_id FROM seed_groups WHERE key = 'giqv'),
        FALSE
    ),
    (
        'Colector solar de bajo costo con seguimiento solar pasivo',
        'CU-2022-0112', '2022', 'ES', 'CUJAE — Facultad de Ingeniería Eléctrica',
        'marzo', 'patente, solar, colector, energía',
        'Patente concedida por sistema de seguimiento solar pasivo para calentadores industriales.',
        '2022-03-10', 3, 2022, 51, TRUE,
        (SELECT int_id FROM seed_projects WHERE key = 'p06'),
        (SELECT int_id FROM seed_groups WHERE key = 'gier'),
        TRUE
    )
    RETURNING id_patent, title
)
INSERT INTO patents_authors (id_patent, id_author)
SELECT pat.id_patent, s.int_id
FROM pat
JOIN (VALUES
    ('Dispositivo de tratamiento electroquímico de aguas residuales textiles', 'eperez'),
    ('Dispositivo de tratamiento electroquímico de aguas residuales textiles', 'disertic'),
    ('Colector solar de bajo costo con seguimiento solar pasivo', 'lramos'),
    ('Colector solar de bajo costo con seguimiento solar pasivo', 'rfernandez')
) AS x(title, user_key) ON x.title = pat.title
JOIN seed_ids s ON s.key = x.user_key;

-- Software (2)
WITH sw AS (
    INSERT INTO softwares (title, number, yearfiled, language, assignee, monthfield, keywords, resume, report_date, month_only, year_only, id_country, is_conceded, id_project, id_group, is_multimedia, publicated)
    VALUES
    (
        'SGI-CUJAE: Módulo de gestión de producción científica',
        'SW-2024-CUJAE-001', '2024', 'ES', 'CUJAE',
        'enero', 'software, gestión, investigación, SGI',
        'Registro de software del Sistema de Gestión de Investigación de la CUJAE.',
        '2024-01-25', 1, 2024, 51, TRUE,
        NULL, NULL, FALSE, FALSE
    ),
    (
        'Simulador interactivo de microredes para formación ingenieril',
        'SW-2023-CUJAE-018', '2023', 'ES', 'CUJAE — FIE',
        'agosto', 'software educativo, microred, simulación',
        'Software multimedia para simulación de operación de microredes con FV.',
        '2023-08-15', 8, 2023, 51, TRUE,
        (SELECT int_id FROM seed_projects WHERE key = 'p06'),
        (SELECT int_id FROM seed_groups WHERE key = 'gier'),
        TRUE, TRUE
    )
    RETURNING id_software, title
)
INSERT INTO softwares_authors (id_software, id_author)
SELECT sw.id_software, s.int_id
FROM sw
JOIN (VALUES
    ('SGI-CUJAE: Módulo de gestión de producción científica', 'mgonzalez'),
    ('SGI-CUJAE: Módulo de gestión de producción científica', 'test_admin'),
    ('Simulador interactivo de microredes para formación ingenieril', 'lramos'),
    ('Simulador interactivo de microredes para formación ingenieril', 'otorres')
) AS x(title, user_key) ON x.title = sw.title
JOIN seed_ids s ON s.key = x.user_key;

-- Eventos (3)
WITH e AS (
    INSERT INTO encounters (title, encounter_name, keywords, resume, id_encounter_type, report_date, isbn, city, issn, organizer, id_country, month_only, year_only, id_project, id_group, publicated)
    VALUES
    (
        'Detección de fallas en redes eléctricas mediante IA',
        'Convención de Ciencia e Innovación 2024',
        'IA, redes eléctricas, convención',
        'Ponencia presentada en la Convención de Ciencia e Innovación sobre diagnóstico inteligente.',
        1, '2024-04-22', '', 'La Habana', '', 'Ministerio de Ciencia, Tecnología y Medio Ambiente', 51, 4, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p01'),
        (SELECT int_id FROM seed_groups WHERE key = 'giacia'),
        FALSE
    ),
    (
        'IoT agrícola con LoRaWAN en fincas piloto',
        'Feria Internacional de La Habana 2024',
        'IoT, agricultura, feria',
        'Demostración de red de sensores para monitoreo de cultivos en FIHAV 2024.',
        1, '2024-11-18', '', 'La Habana', '', 'Palacio de Convenciones', 51, 11, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p08'),
        (SELECT int_id FROM seed_groups WHERE key = 'gitel'),
        FALSE
    ),
    (
        'Economía circular en industrias cubanas',
        'Taller Nacional de Desarrollo Sostenible 2023',
        'economía circular, sostenibilidad',
        'Taller sobre indicadores de economía circular aplicados a la industria cubana.',
        1, '2023-09-05', '', 'Santa Clara', '', 'Universidad Central Marta Abreu', 51, 9, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p09'),
        (SELECT int_id FROM seed_groups WHERE key = 'gieco'),
        FALSE
    )
    RETURNING id_encounter, title
)
INSERT INTO encounters_authors (id_encounter, id_author)
SELECT e.id_encounter, s.int_id
FROM e
JOIN (VALUES
    ('Detección de fallas en redes eléctricas mediante IA', 'rivas'),
    ('Detección de fallas en redes eléctricas mediante IA', 'mgonzalez'),
    ('IoT agrícola con LoRaWAN en fincas piloto', 'rfernandez'),
    ('IoT agrícola con LoRaWAN en fincas piloto', 'otorres'),
    ('Economía circular en industrias cubanas', 'acastro'),
    ('Economía circular en industrias cubanas', 'test_admin')
) AS x(title, user_key) ON x.title = e.title
JOIN seed_ids s ON s.key = x.user_key;

-- Premios (2)
WITH pr AS (
    INSERT INTO prizes (title, grant_institution, keywords, resume, id_prize_type, report_date, id_country, month_only, year_only, id_project, id_group, publicated)
    VALUES
    (
        'Premio Anual de Innovación Tecnológica CITMA 2023',
        'Ministerio de Ciencia, Tecnología y Medio Ambiente',
        'premio, innovación, CITMA',
        'Reconocimiento por el desarrollo del robot colaborativo para soldadura industrial.',
        2, '2023-12-20', 51, 12, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p03'),
        (SELECT int_id FROM seed_groups WHERE key = 'gimec'),
        FALSE
    ),
    (
        'Premio de Excelencia Docente CUJAE 2022',
        'Consejo Universitario CUJAE',
        'premio, docencia, excelencia',
        'Premio a la labor docente e investigativa en energías renovables.',
        2, '2022-07-15', 51, 7, 2022,
        (SELECT int_id FROM seed_projects WHERE key = 'p06'),
        (SELECT int_id FROM seed_groups WHERE key = 'gier'),
        FALSE
    )
    RETURNING id_prize, title
)
INSERT INTO prizes_authors (id_prize, id_author)
SELECT pr.id_prize, s.int_id
FROM pr
JOIN (VALUES
    ('Premio Anual de Innovación Tecnológica CITMA 2023', 'jmartinez'),
    ('Premio Anual de Innovación Tecnológica CITMA 2023', 'smorales'),
    ('Premio de Excelencia Docente CUJAE 2022', 'lramos')
) AS x(title, user_key) ON x.title = pr.title
JOIN seed_ids s ON s.key = x.user_key;

-- Tesis (4)
WITH t AS (
    INSERT INTO theses (title, institution, keywords, resume, id_thesis_type, report_date, id_country, month_only, year_only, id_project, id_group, publicated)
    VALUES
    (
        'Modelos de aprendizaje profundo para diagnóstico de equipos eléctricos',
        'Universidad Tecnológica José Antonio Echeverría',
        'tesis doctoral, deep learning, equipos eléctricos',
        'Tesis doctoral en automatización sobre diagnóstico inteligente de activos eléctricos.',
        3, '2024-06-30', 51, 6, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p01'),
        (SELECT int_id FROM seed_groups WHERE key = 'giacia'),
        FALSE
    ),
    (
        'Estudio experimental de hormigón con fibras de marabú',
        'Universidad Tecnológica José Antonio Echeverría',
        'tesis maestría, hormigón, fibras vegetales',
        'Tesis de maestría en ingeniería civil sobre fibras de marabú en hormigón estructural.',
        2, '2023-12-15', 51, 12, 2023,
        (SELECT int_id FROM seed_projects WHERE key = 'p02'),
        (SELECT int_id FROM seed_groups WHERE key = 'giest'),
        FALSE
    ),
    (
        'Diseño de red IoT para monitoreo de invernaderos',
        'Universidad Tecnológica José Antonio Echeverría',
        'tesis maestría, IoT, agricultura',
        'Tesis de maestría en telecomunicaciones sobre redes de sensores en invernaderos.',
        2, '2024-05-20', 51, 5, 2024,
        (SELECT int_id FROM seed_projects WHERE key = 'p08'),
        (SELECT int_id FROM seed_groups WHERE key = 'gitel'),
        FALSE
    ),
    (
        'Análisis de vulnerabilidad sísmica de una escuela tipo en La Habana',
        'Universidad Tecnológica José Antonio Echeverría',
        'tesis pregrado, sismo, escuelas',
        'Trabajo de diploma sobre evaluación sísmica de edificaciones escolares.',
        4, '2021-07-10', 51, 7, 2021,
        (SELECT int_id FROM seed_projects WHERE key = 'p10'),
        (SELECT int_id FROM seed_groups WHERE key = 'giest'),
        FALSE
    )
    RETURNING id_thesis, title
)
INSERT INTO theses_authors (id_thesis, id_author)
SELECT t.id_thesis, s.int_id
FROM t
JOIN (VALUES
    ('Modelos de aprendizaje profundo para diagnóstico de equipos eléctricos', 'otorres'),
    ('Estudio experimental de hormigón con fibras de marabú', 'vgomez'),
    ('Diseño de red IoT para monitoreo de invernaderos', 'otorres'),
    ('Análisis de vulnerabilidad sísmica de una escuela tipo en La Habana', 'vgomez')
) AS x(title, user_key) ON x.title = t.title
JOIN seed_ids s ON s.key = x.user_key;

INSERT INTO theses_tutors (id_thesis, id_author)
SELECT th.id_thesis, s.int_id
FROM theses th
JOIN (VALUES
    ('Modelos de aprendizaje profundo para diagnóstico de equipos eléctricos', 'rivas'),
    ('Estudio experimental de hormigón con fibras de marabú', 'pardo'),
    ('Diseño de red IoT para monitoreo de invernaderos', 'rfernandez'),
    ('Análisis de vulnerabilidad sísmica de una escuela tipo en La Habana', 'pardo')
) AS x(title, user_key) ON x.title = th.title
JOIN seed_ids s ON s.key = x.user_key;

COMMIT;

-- Resumen
SELECT 'integrantes_conservados+ nuevos' AS item, COUNT(*)::TEXT AS total FROM integrant
UNION ALL SELECT 'grupos', COUNT(*)::TEXT FROM public."group"
UNION ALL SELECT 'proyectos', COUNT(*)::TEXT FROM project
UNION ALL SELECT 'registros_totales',
    (
        (SELECT COUNT(*) FROM articles) + (SELECT COUNT(*) FROM books) +
        (SELECT COUNT(*) FROM monographs) + (SELECT COUNT(*) FROM norms) +
        (SELECT COUNT(*) FROM patents) + (SELECT COUNT(*) FROM softwares) +
        (SELECT COUNT(*) FROM encounters) + (SELECT COUNT(*) FROM prizes) +
        (SELECT COUNT(*) FROM theses)
    )::TEXT;
