/**
 * Matriz de permisos esperada vs lógica documentada en usePermissions (simulación caja negra UI).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const matchesRole = (userRoles, role) => {
  if (userRoles.includes(role)) return true;
  if (role === 'consejo') return userRoles.includes('consejo_cientifico');
  if (role === 'consejo_cientifico') return userRoles.includes('consejo');
  if (role === 'usuario') return userRoles.includes('integrant');
  if (role === 'integrant') return userRoles.includes('usuario');
  return false;
};

const permFns = (roles) => {
  const hasRole = (r) => matchesRole(roles, r);
  const isAdmin = () => hasRole('admin');
  const isConsejo = () => hasRole('consejo') || hasRole('consejo_cientifico');
  const isAutor = () => hasRole('autor_registro');
  const isPublicador = () => hasRole('publicador');
  const isIntegrant = () => {
    const base = matchesRole(roles, 'usuario') || matchesRole(roles, 'integrant');
    return base && !isAdmin() && !isConsejo() && !isAutor() && !isPublicador();
  };
  return {
    canCreateRecords: () => isAdmin() || isAutor(),
    canCreateGroups: () => isAdmin() || isConsejo(),
    canCreateProjects: () => isAdmin() || isConsejo(),
    canPublishToZenodo: () => isAdmin() || isPublicador(),
    canModifyRecord: (isAuthor) => isAdmin() || (isAutor() && isAuthor),
    canDeleteRecord: (isAuthor) => isAdmin() || (isAutor() && isAuthor),
    canManageUsers: () => isAdmin(),
    canViewStatistics: () => isAdmin() || isConsejo(),
  };
};

const personas = [
  { id: 'P01', label: 'Solo Usuario', roles: ['usuario'] },
  { id: 'P02', label: 'Solo Autor', roles: ['usuario', 'autor_registro'] },
  { id: 'P03', label: 'Solo Consejo', roles: ['usuario', 'consejo'] },
  { id: 'P04', label: 'Solo Publicador', roles: ['usuario', 'publicador'] },
  { id: 'P05', label: 'Consejo + Autor', roles: ['usuario', 'consejo', 'autor_registro'] },
  { id: 'P06', label: 'Administrador', roles: ['admin', 'usuario'] },
  { id: 'P07', label: 'Autor + Publicador', roles: ['usuario', 'autor_registro', 'publicador'] },
  { id: 'P08', label: 'Legacy integrant', roles: ['integrant'] },
];

const cases = [
  { id: 'TC-PERM-01', action: 'Crear registro nuevo', fn: (p) => p.canCreateRecords() },
  { id: 'TC-PERM-02', action: 'Crear grupo', fn: (p) => p.canCreateGroups() },
  { id: 'TC-PERM-03', action: 'Crear proyecto', fn: (p) => p.canCreateProjects() },
  { id: 'TC-PERM-04', action: 'Publicar Zenodo', fn: (p) => p.canPublishToZenodo() },
  { id: 'TC-PERM-05', action: 'Modificar registro ajeno', fn: (p) => p.canModifyRecord(false) },
  { id: 'TC-PERM-06', action: 'Modificar registro propio (autor)', fn: (p) => p.canModifyRecord(true) },
  { id: 'TC-PERM-07', action: 'Eliminar registro ajeno', fn: (p) => p.canDeleteRecord(false) },
  { id: 'TC-PERM-08', action: 'Gestionar usuarios', fn: (p) => p.canManageUsers() },
  { id: 'TC-PERM-09', action: 'Ver estadísticas', fn: (p) => p.canViewStatistics() },
];

const matrix = [];
for (const persona of personas) {
  const p = permFns(persona.roles);
  for (const tc of cases) {
    matrix.push({
      personaId: persona.id,
      persona: persona.label,
      roles: persona.roles,
      testId: tc.id,
      action: tc.action,
      allowed: tc.fn(p),
    });
  }
}

const docsDir = path.join(__dirname, '..', 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const out = path.join(docsDir, 'PRUEBAS_CAJA_NEGRA_MATRIZ_PERMISOS.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), matrix }, null, 2));
console.log(`Matriz permisos: ${out} (${matrix.length} celdas)`);
