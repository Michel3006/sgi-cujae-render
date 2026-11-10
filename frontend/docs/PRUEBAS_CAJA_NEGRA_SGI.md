# Informe de pruebas de caja negra — SGI (2.ª ejecución)

**Fecha de ejecución:** 4 de junio de 2026 (re-ejecución tras corrección de seguridad en backend)  
**Entorno:** Frontend Vite + API FastAPI en `http://127.0.0.1:8000`  
**Motivo de re-ejecución:** El usuario corrigió los hallazgos críticos H-01 y H-02 (autenticación obligatoria y protección de roles) en el backend.

---

## Resumen ejecutivo

| Métrica | 1.ª ejecución | 2.ª ejecución (actual) |
|---------|---------------|----------------------|
| Pruebas API automatizadas | 8 | **22** |
| PASS | 3 | **21** |
| FAIL | 2 | **0** |
| WARN | 1 | **0** |
| SKIP | 2 | **1** |
| Matriz permisos UI | 72 celdas | 72 celdas (sin cambios) |

### Conclusión general

Los **fallos críticos de seguridad en la API quedaron resueltos**. Todas las rutas sensibles probadas devuelven **HTTP 401** sin token. Un usuario **Consejo** autenticado **no puede** modificar roles de otros integrantes (**HTTP 403**) ni acceder a publicaciones Zenodo (**HTTP 403**).

Quedan pendientes mejoras **no críticas** en frontend (bitácora `/audit`, credenciales demo, alineación contrato login) y validación de permisos por rol en operaciones de escritura más allá de integrantes/Zenodo.

---

## Artefactos generados

| Archivo | Descripción |
|---------|-------------|
| `docs/PRUEBAS_CAJA_NEGRA_SGI.md` | Este informe |
| `docs/PRUEBAS_CAJA_NEGRA_RESULTADOS_API.json` | Resultados machine-readable (22 casos) |
| `docs/PRUEBAS_CAJA_NEGRA_MATRIZ_PERMISOS.json` | 72 combinaciones persona × acción (UI) |
| `scripts/blackbox-api-tests.mjs` | Script reproducible (`AUTH_TOKEN` opcional) |
| `scripts/blackbox-permissions-matrix.mjs` | Matriz de permisos frontend |

### Cómo reproducir

```bash
# Solo pruebas anónimas
node scripts/blackbox-api-tests.mjs

# Incluir suite autenticada (usuario Consejo de ejemplo)
set AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs...
node scripts/blackbox-api-tests.mjs

node scripts/blackbox-permissions-matrix.mjs
```

---

## 1. Contexto del sistema

### 1.1 Propósito

Aplicación web para gestión de investigación universitaria:

- **Grupos** y **proyectos** de investigación
- **Registros científicos** (9 tipos: artículo, libro, monografía, norma, patente, software, evento, premio, tesis)
- **Estadísticas** y exportación PDF
- **Publicación Zenodo** (principalmente artículos)
- **Gestión de roles** de usuario
- **Bitácora** de auditoría
- **Asistente** conversacional

### 1.2 Roles y reglas de negocio

| Rol | Crear registros | Crear grupos/proyectos | Modificar registros ajenos | Publicar Zenodo | Gestionar usuarios | Estadísticas |
|-----|-----------------|------------------------|----------------------------|-----------------|-------------------|--------------|
| Usuario (todos) | No | No | No | No | No | No |
| Autor | Sí | No | No (solo propios) | No* | No | No |
| Consejo Científico | No | Sí | **No** | No | No | Sí |
| Publicador | No | No | No | Sí | No | No |
| Administrador | Sí | Sí | Sí | Sí | Sí | Sí |

\* Combinaciones de roles posibles (Autor + Publicador, etc.).

### 1.3 Casos de uso (CU)

| ID | Módulo | Rutas |
|----|--------|-------|
| CU-01 | Autenticación | `/login` |
| CU-02 | Dashboard | `/dashboard` |
| CU-03 | Grupos | `/groups`, `/groups/new`, `/groups/:id` |
| CU-04 | Proyectos | `/projects`, `/projects/new`, `/projects/:id` |
| CU-05 | Registros | `/records`, `/records/new`, `/records/:id/edit` |
| CU-06 | Zenodo | Modal en lista/formulario |
| CU-07 | Estadísticas | `/statistics` |
| CU-08 | Usuarios/roles | `/users` |
| CU-09 | Bitácora | `/audit` |
| CU-10 | Asistente | `/assistant` |

---

## 2. Metodología

### 2.1 Enfoque caja negra

- Entradas: HTTP requests, URLs, roles simulados, credenciales.
- Salidas: códigos HTTP, visibilidad UI esperada, matriz permisos.
- **No** se valida implementación interna como criterio de aprobación.

### 2.2 Criterios

| Estado | Significado |
|--------|-------------|
| **PASS** | Comportamiento correcto |
| **FAIL** | Incumple regla o regresión |
| **WARN** | Funciona con riesgo residual |
| **SKIP** | No ejecutable (sin credenciales) |

### 2.3 Token usado en suite autenticada

Usuario **18428**, rol **CONSEJO** (token JWT activo en sesión de desarrollo). Permite validar listados autenticados y denegación de acciones privilegiadas.

---

## 3. Resultados API — ejecución completa (22 casos)

```
✓ TC-API-001  Disponibilidad servidor                    PASS  HTTP 200
✓ TC-API-002  Login credenciales incorrectas             PASS  HTTP 401
✓ TC-API-003  Login con email (schema repo)              PASS  HTTP 422
○ TC-API-004  Login demo jperez@cujae.edu.cu             SKIP  HTTP 401
✓ TC-API-005a GET /articles/ sin auth                    PASS  HTTP 401
✓ TC-API-005b GET /groups/ sin auth                      PASS  HTTP 401
✓ TC-API-005c GET /projects/ sin auth                    PASS  HTTP 401
✓ TC-API-005d GET /integrants/ sin auth                  PASS  HTTP 401
✓ TC-API-005e GET /roles/ sin auth                        PASS  HTTP 401
✓ TC-API-005f GET /theses/ sin auth                        PASS  HTTP 401
✓ TC-API-006  POST /articles/ sin auth                     PASS  HTTP 401
✓ TC-API-007  PUT /integrants/{id} sin auth                PASS  HTTP 401
✓ TC-API-008  GET /zenodo/entity-types sin auth            PASS  HTTP 401
✓ TC-API-009  Suite autenticada                            PASS  Token Consejo
✓ TC-API-010  GET /roles/ → id_rol                         PASS  id_rol=true (front normaliza)
✓ TC-API-011  GET integrante autenticado                   PASS  roles=[CONSEJO]
✓ TC-API-012a Listar grupos autenticado                   PASS  HTTP 200
✓ TC-API-012b Listar proyectos autenticado                PASS  HTTP 200
✓ TC-API-012c Listar artículos autenticado                PASS  HTTP 200
✓ TC-API-013  Conteo proyectos/facultad                    PASS  HTTP 200
✓ TC-API-014  PUT roles otro integrante (Consejo)          PASS  HTTP 403
✓ TC-API-015  GET /zenodo/publications (Consejo)           PASS  HTTP 403
```

**Resumen:** 21 PASS · 0 FAIL · 0 WARN · 1 SKIP

### 3.1 Comparativa con 1.ª ejecución (críticos corregidos)

| Prueba | Antes | Ahora | Estado |
|--------|-------|-------|--------|
| GET `/articles/` sin token | HTTP 200 ❌ | HTTP 401 ✅ | **CORREGIDO** |
| GET `/integrants/` sin token | HTTP 200 ❌ | HTTP 401 ✅ | **CORREGIDO** |
| PUT `/integrants/{id}` sin token | HTTP 200 ❌ | HTTP 401 ✅ | **CORREGIDO** |
| POST `/articles/` sin token | HTTP 422 | HTTP 401 ✅ | **CORREGIDO** |
| GET `/groups/`, `/projects/`, `/roles/` sin token | 200 ❌ | HTTP 401 ✅ | **CORREGIDO** |
| PUT roles como Consejo | No probado | HTTP 403 ✅ | **NUEVO — OK** |
| Zenodo sin token | HTTP 200 | HTTP 401 ✅ | **REFORZADO** |

---

## 4. Matriz de permisos frontend (72 casos)

Generada desde la lógica de `usePermissions.ts`. **Todos los casos siguen siendo coherentes** con las reglas de negocio acordadas.

### Resumen por perfil

| Persona | Roles | Crear registro | Crear grupo | Crear proyecto | Publicar Zenodo | Modificar ajeno | Estadísticas |
|---------|-------|----------------|-------------|----------------|-----------------|-----------------|--------------|
| P01 Solo Usuario | usuario | No | No | No | No | No | No |
| P02 Solo Autor | usuario, autor | **Sí** | No | No | No | No | No |
| P03 Solo Consejo | usuario, consejo | No | **Sí** | **Sí** | No | No | **Sí** |
| P04 Solo Publicador | usuario, publicador | No | No | No | **Sí** | No | No |
| P05 Consejo+Autor | consejo, autor | **Sí** | **Sí** | **Sí** | No | No | **Sí** |
| P06 Admin | admin, usuario | **Sí** | **Sí** | **Sí** | **Sí** | **Sí** | **Sí** |
| P07 Autor+Publicador | autor, publicador | **Sí** | No | No | **Sí** | No | No |
| P08 Legacy integrant | integrant | No | No | No | No | No | No |

### Caso especial documentado (WARN UI)

| ID | Descripción | Resultado |
|----|-------------|-----------|
| TC-PERM-P01-06 | Usuario base modifica registro **propio** (figura como autor) | **Denegado** — requiere rol Autor | PASS |

---

## 5. Casos de prueba por módulo (UI + API)

### CU-01 — Autenticación

| ID | Prueba | Resultado 2.ª ejec. | Estado |
|----|--------|---------------------|--------|
| TC-AUTH-01 | Servidor disponible | HTTP 200 | PASS |
| TC-AUTH-02 | Credenciales inválidas | HTTP 401 | PASS |
| TC-AUTH-03 | Payload `{email}` rechazado | HTTP 422 | PASS |
| TC-AUTH-04 | Payload `{user_name}` aceptado | Campo válido | PASS |
| TC-AUTH-05 | Demo `jperez@cujae.edu.cu` | HTTP 401 — no en BD | SKIP |
| TC-AUTH-06 | Ruta `/dashboard` sin login | Redirect login | PASS |
| TC-AUTH-07 | Texto demo en AuthForm | Usuario inexistente | **WARN** H-07 |

### CU-02 — Dashboard

| ID | Prueba | Rol | Estado |
|----|--------|-----|--------|
| TC-DASH-01 | Acceso autenticado | Cualquiera | PASS |
| TC-DASH-02 | Botón nuevo registro oculto | Solo Usuario | PASS |
| TC-DASH-03 | Botón nuevo registro visible | Autor | PASS |
| TC-DASH-04 | Botón nuevo proyecto visible | Consejo | PASS |
| TC-DASH-05 | URL `/records/new` bloqueada | Solo Usuario | PASS |

### CU-03 — Grupos

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-GRP-01 | GET `/groups/` sin token | HTTP 401 | **PASS** (antes FAIL) |
| TC-GRP-02 | Botón nuevo grupo | Consejo sí / Usuario no | PASS |
| TC-GRP-03 | URL `/groups/new` guard | Redirect sin permiso | PASS |
| TC-GRP-04 | Edición grupo | `canEditGroupDetails` | PASS |

### CU-04 — Proyectos

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-PRJ-01 | GET `/projects/` sin token | HTTP 401 | **PASS** |
| TC-PRJ-02 | Crear proyecto UI | Consejo/Admin | PASS |
| TC-PRJ-03 | URL `/projects/new` guard | Redirect | PASS |
| TC-PRJ-04 | `/projects/count/faculty/` autenticado | HTTP 200 | PASS |

### CU-05 — Registros

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-REC-01 | GET `/articles/` sin token | HTTP 401 | **PASS** |
| TC-REC-02 | POST `/articles/` sin token | HTTP 401 | **PASS** |
| TC-REC-03 | Crear registro UI | Autor/Admin | PASS |
| TC-REC-04 | Consejo no crea registros | Sin botón + redirect | PASS |
| TC-REC-05 | Consejo no edita ajenos | `canModifyRecord(false)` | PASS |
| TC-REC-06 | URL edit bloqueada Consejo | Redirect vista | PASS |
| TC-REC-07 | Artículo con DOI → no Zenodo | Regla DOI | PASS |

### CU-06 — Zenodo

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-ZEN-01 | `/zenodo/entity-types` sin token | HTTP 401 | **PASS** |
| TC-ZEN-02 | `/zenodo/publications` Consejo | HTTP 403 | **PASS** |
| TC-ZEN-03 | Menú publicar UI | Solo Publicador/Admin | PASS |
| TC-ZEN-04 | Solo artículos sin DOI | Regla negocio | PASS |

### CU-07 — Estadísticas

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-STA-01 | Menú oculto Usuario | Layout | PASS |
| TC-STA-02 | URL `/statistics` redirect | useEffect | PASS |
| TC-STA-03 | API conteos autenticada | HTTP 200 Consejo | PASS |

### CU-08 — Gestión de roles

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-USR-01 | UI `/users` no Admin | Acceso denegado | PASS |
| TC-USR-02 | PUT roles sin token | HTTP 401 | **PASS** |
| TC-USR-03 | PUT roles Consejo → otro user | HTTP 403 | **PASS** |
| TC-USR-04 | `id_rol` en API | Front normaliza | PASS |
| TC-USR-05 | Modal guardar roles UI | Batch `roles_list` | PASS* |

\* Validado en sesiones anteriores con admin autenticado.

### CU-09 — Bitácora

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-AUD-01 | Menú oculto no Admin | Layout | PASS |
| TC-AUD-02 | URL `/audit` directa | **Carga sin guard** | **FAIL** H-03 |
| TC-AUD-03 | Mapeo `id_rol` en AuditLog | Posible error display | WARN H-04 |

### CU-10 — Asistente

| ID | Prueba | Resultado | Estado |
|----|--------|-----------|--------|
| TC-ASST-01 | Acceso autenticado | Abierto a todos | PASS |
| TC-ASST-02 | Historial localStorage | Persiste | PASS |

---

## 6. Hallazgos — estado actualizado

### ✅ RESUELTO — H-01: API sin autenticación

**Antes:** GET/POST/PUT en artículos, integrantes, grupos, proyectos respondían 200 sin token.  
**Ahora:** Todos los endpoints probados devuelven **401** sin `Authorization`.  
**Evidencia:** TC-API-005a…f, TC-API-006, TC-API-007.

### ✅ RESUELTO — H-02: Modificación de roles sin autenticación

**Antes:** `PUT /integrants/18420` → 200 anónimo.  
**Ahora:** HTTP **401** sin token; HTTP **403** con token Consejo.  
**Evidencia:** TC-API-007, TC-API-014.

### ✅ PARCIALMENTE RESUELTO — H-05: Permisos solo en frontend

**Mejora:** Autenticación global + restricción explícita en roles de integrantes y Zenodo.  
**Pendiente:** Verificar que POST/PUT de artículos/grupos/proyectos exija rol Autor/Consejo respectivamente (no probado con token Autor en esta batería).

### ❌ PENDIENTE — H-03: Bitácora accesible por URL

**Problema:** `/audit` no tiene `canViewAuditLog()` ni redirect.  
**Impacto:** Usuario autenticado no admin puede ver trazas navegando directamente.  
**Recomendación:** Añadir guard como en `Statistics.tsx`.

### ⚠️ PENDIENTE — H-04: Mapeo roles en AuditLog

Usa `r.id_role`; API devuelve `id_rol`. Reutilizar `getRoleNumericId`.

### ✅ RESUELTO — H-06: Usuario base no edita registros aunque sea autor

**Regla:** Solo **Autor** (o **Admin**) puede modificar/eliminar registros; el rol Usuario base es solo lectura aunque aparezca en la lista de autores.

### ⚠️ PENDIENTE — H-07: Credenciales demo obsoletas

AuthForm muestra `jperez@cujae.edu.cu` — no existe en BD (401).

### ⚠️ PENDIENTE — H-08: Contrato login email vs user_name

Runtime exige `user_name`; repo documenta `email`. Unificar.

### ✅ RESUELTO — H-09: roles_list con null

Normalización `id_rol` en frontend; backend ahora rechaza peticiones no autenticadas.

---

## 7. Checklist guards frontend

| Ruta | Auth | Guard rol | Estado |
|------|------|-----------|--------|
| `/login` | Público | — | OK |
| `/dashboard` | Sí | No | OK |
| `/groups/new` | Sí | Consejo/Admin | OK |
| `/projects/new` | Sí | Consejo/Admin | OK |
| `/records/new` | Sí | Autor/Admin | OK |
| `/records/:id/edit` | Sí | Autor propio/Admin | OK |
| `/statistics` | Sí | Consejo/Admin | OK |
| `/users` | Sí | Admin (UI) | OK |
| `/audit` | Sí | Admin esperado | **Falta guard** |
| `/assistant` | Sí | Todos | OK |

---

## 8. Checklist seguridad API (post-corrección)

| Endpoint | Sin token | Consejo autenticado | Esperado |
|----------|-----------|---------------------|----------|
| GET `/articles/` | 401 ✅ | 200 ✅ | OK |
| POST `/articles/` | 401 ✅ | — | Auth requerida |
| GET `/integrants/` | 401 ✅ | — | OK |
| PUT `/integrants/{id}` roles | 401 ✅ | 403 ✅ | OK |
| GET `/groups/` | 401 ✅ | 200 ✅ | OK |
| GET `/projects/` | 401 ✅ | 200 ✅ | OK |
| GET `/zenodo/entity-types` | 401 ✅ | — | Auth requerida |
| GET `/zenodo/publications` | — | 403 ✅ | Solo Publicador/Admin |

---

## 9. Conclusiones y próximos pasos

### Logros de esta re-ejecución

1. **Cero fallos** en la batería API automatizada (21/21 ejecutables en PASS).
2. **Autenticación obligatoria** verificada en 6 recursos GET + POST + PUT.
3. **Escalación de privilegios bloqueada** en integrantes (403 para Consejo).
4. **Zenodo protegido** (401 anónimo, 403 Consejo).

### Prioridad recomendada

| Prioridad | Acción |
|-----------|--------|
| Media | Guard en `/audit` (H-03) |
| Baja | Unificar login `user_name`/`email` (H-08) |
| Baja | Actualizar credenciales demo (H-07) |
| Baja | Mapeo roles AuditLog (H-04) |
| Opcional | Ampliar pruebas API con tokens Admin + Autor + Publicador |

---

## 10. Anexo — tipos de registro

| Tipo | Endpoint | Zenodo UI |
|------|----------|-----------|
| articulo | `/articles/` | Sí (sin DOI) |
| libro | `/books/` | No |
| monografia | `/monographs/` | No |
| norma | `/norms/` | No |
| patente | `/patents/` | No |
| software | `/softwares/` | No |
| evento | `/encounters/` | No |
| premio | `/prizes/` | No |
| tesis | `/theses/` | No |

---

*Informe regenerado tras corrección de seguridad en backend. Para actualizar resultados: `node scripts/blackbox-api-tests.mjs` con backend en marcha.*
