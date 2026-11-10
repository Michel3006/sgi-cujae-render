/**
 * Pruebas de caja negra — API SGI
 * Ejecutar: node scripts/blackbox-api-tests.mjs
 * Con token: set AUTH_TOKEN=eyJ... && node scripts/blackbox-api-tests.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';
const ENV_TOKEN = process.env.AUTH_TOKEN || null;

const results = [];

const log = (id, name, status, detail, extra = {}) => {
  results.push({ id, name, status, detail, ...extra });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'SKIP' ? '○' : '!';
  console.log(`${icon} [${id}] ${name}: ${status} — ${detail}`);
};

async function request(method, pathUrl, { body, token, expectStatus } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathUrl}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: expectStatus ? res.status === expectStatus : res.ok, status: res.status, data };
}

const UNAUTH_GET_PATHS = [
  ['TC-API-005a', '/articles/?limit=1', 'Artículos'],
  ['TC-API-005b', '/groups/?limit=1', 'Grupos'],
  ['TC-API-005c', '/projects/?limit=1', 'Proyectos'],
  ['TC-API-005d', '/integrants/?limit=1', 'Integrantes'],
  ['TC-API-005e', '/roles/?limit=1', 'Roles'],
  ['TC-API-005f', '/theses/?limit=1', 'Tesis'],
];

async function main() {
  console.log(`\n=== Pruebas caja negra API — ${BASE} ===\n`);

  const health = await request('GET', '/docs');
  log('TC-API-001', 'Disponibilidad del servidor', health.status === 200 ? 'PASS' : 'FAIL', `HTTP ${health.status}`);

  const badLogin = await request('POST', '/auth/login', {
    body: { user_name: 'noexiste@test.com', password: 'wrong' },
  });
  log(
    'TC-API-002',
    'Login credenciales incorrectas',
    badLogin.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${badLogin.status}`,
  );

  const loginEmail = await request('POST', '/auth/login', {
    body: { email: 'demo@test.com', password: 'x' },
  });
  log(
    'TC-API-003',
    'Login con email (schema repo)',
    loginEmail.status === 422 ? 'PASS' : 'FAIL',
    `HTTP ${loginEmail.status} — runtime exige user_name`,
  );

  const loginDemo = await request('POST', '/auth/login', {
    body: { user_name: 'jperez@cujae.edu.cu', password: 'password123' },
  });
  let token = ENV_TOKEN;
  let userId = null;
  if (loginDemo.ok && loginDemo.data?.access_token) {
    token = loginDemo.data.access_token;
    userId = loginDemo.data.user_id;
    log('TC-API-004', 'Login demo jperez@cujae.edu.cu', 'PASS', `user_id=${userId}`);
  } else if (ENV_TOKEN) {
    log('TC-API-004', 'Login demo', 'SKIP', `HTTP ${loginDemo.status}; usando AUTH_TOKEN del entorno`);
    const meProbe = await request('GET', '/integrants/me', { token: ENV_TOKEN });
    if (meProbe.ok && meProbe.data?.id_integrant) {
      userId = meProbe.data.id_integrant;
    }
  } else {
    log('TC-API-004', 'Login demo jperez@cujae.edu.cu', 'SKIP', `HTTP ${loginDemo.status} — sin credenciales demo`);
  }

  for (const [id, pathUrl, label] of UNAUTH_GET_PATHS) {
    const r = await request('GET', pathUrl);
    log(
      id,
      `GET ${label} sin autenticación`,
      r.status === 401 || r.status === 403 ? 'PASS' : r.status === 200 ? 'FAIL' : 'WARN',
      `HTTP ${r.status}`,
    );
  }

  const postArticle = await request('POST', '/articles/', { body: { title: 'test-unauth' } });
  log(
    'TC-API-006',
    'POST /articles/ sin autenticación',
    postArticle.status === 401 || postArticle.status === 403 ? 'PASS' : 'FAIL',
    `HTTP ${postArticle.status}`,
  );

  const putIntegrant = await request('PUT', '/integrants/18420', { body: { roles_list: [2, 4] } });
  log(
    'TC-API-007',
    'PUT /integrants/{id} sin autenticación',
    putIntegrant.status === 401 || putIntegrant.status === 403 ? 'PASS' : 'FAIL',
    `HTTP ${putIntegrant.status}`,
  );

  const zenodoPublic = await request('GET', '/zenodo/entity-types');
  log(
    'TC-API-008',
    'GET /zenodo/entity-types sin autenticación',
    zenodoPublic.status === 401 || zenodoPublic.status === 403 ? 'PASS' : zenodoPublic.status === 200 ? 'WARN' : 'FAIL',
    `HTTP ${zenodoPublic.status}`,
  );

  if (!token) {
    log('TC-API-009', 'Suite autenticada', 'SKIP', 'Sin token (defina AUTH_TOKEN o credenciales demo)');
    writeReport();
    return;
  }

  log('TC-API-009', 'Suite autenticada', 'PASS', `Token disponible${userId ? ` user_id=${userId}` : ''}`);

  const roles = await request('GET', '/roles/?limit=20', { token });
  const sample = Array.isArray(roles.data) ? roles.data[0] : null;
  const hasIdRole = sample && 'id_role' in sample;
  const hasIdRol = sample && 'id_rol' in sample;
  log(
    'TC-API-010',
    'GET /roles/ estructura de ID',
    roles.ok ? 'PASS' : 'FAIL',
    `id_role=${hasIdRole}, id_rol=${hasIdRol}`,
    { finding: hasIdRol && !hasIdRole ? 'Serializa id_rol; front normaliza' : 'OK' },
  );

  const targetId = userId || 18428;
  const me = await request('GET', `/integrants/${targetId}`, { token });
  const roleNames = me.data?.roles?.map((r) => r.role_name) ?? [];
  log('TC-API-011', 'GET integrante autenticado', me.ok ? 'PASS' : 'FAIL', `roles=[${roleNames.join(', ')}]`);

  for (const [id, pathUrl, label] of [
    ['TC-API-012a', '/groups/?limit=2', 'Grupos'],
    ['TC-API-012b', '/projects/?limit=2', 'Proyectos'],
    ['TC-API-012c', '/articles/?limit=2', 'Artículos'],
  ]) {
    const r = await request('GET', pathUrl, { token });
    log(id, `Listar ${label} autenticado`, r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
  }

  const projCount = await request('GET', '/projects/count/faculty/', { token });
  log('TC-API-013', 'Conteo proyectos por facultad', projCount.ok ? 'PASS' : 'FAIL', `HTTP ${projCount.status}`);

  const putRolesAuth = await request('PUT', '/integrants/18420', {
    token,
    body: { roles_list: [2, 4] },
  });
  const isAdmin = roleNames.some((n) => String(n).toUpperCase().includes('ADMIN'));
  const expectedPut = isAdmin ? [200, 400, 404] : [401, 403];
  log(
    'TC-API-014',
    'PUT roles otro integrante (según rol caller)',
    expectedPut.includes(putRolesAuth.status) ? 'PASS' : 'FAIL',
    `HTTP ${putRolesAuth.status} caller=[${roleNames.join(',')}]`,
    { expected: isAdmin ? 'Admin puede' : 'No admin → 403/401' },
  );

  const zenodoAuth = await request('GET', '/zenodo/publications?limit=1', { token });
  const isPublicador = roleNames.some((n) => String(n).toUpperCase().includes('PUBLICADOR'));
  const isAdminOrPub = isAdmin || isPublicador;
  log(
    'TC-API-015',
    'GET /zenodo/publications autenticado',
    zenodoAuth.status === 200 || (!isAdminOrPub && zenodoAuth.status === 403) ? 'PASS' : 'WARN',
    `HTTP ${zenodoAuth.status}`,
  );

  writeReport();
}

function writeReport() {
  const docsDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, 'PRUEBAS_CAJA_NEGRA_RESULTADOS_API.json');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const warn = results.filter((r) => r.status === 'WARN').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE,
        summary: { total: results.length, pass, fail, warn, skip },
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\nResumen: ${pass} PASS, ${fail} FAIL, ${warn} WARN, ${skip} SKIP`);
  console.log(`JSON: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
