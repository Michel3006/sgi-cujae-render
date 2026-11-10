# Usuarios de prueba por rol

Usuarios genéricos para probar permisos y flujos según cada rol del sistema.

## Login

**Endpoint:** `POST /auth/login`

```json
{
  "user_name": "<user_name de la tabla>",
  "password": "<ver nota de contraseña>"
}
```

**Respuesta:** `access_token`, `user_id`, `token_type: bearer`

Usar el token en cabecera: `Authorization: Bearer <access_token>`

---

## Credenciales

| Rol        | id_rol | user_name       | Email                      | Contraseña*   |
|-----------|--------|-----------------|----------------------------|---------------|
| ADMIN     | 1      | `test_admin`    | test_admin@cujae.test      | `Test1234!`   |
| USUARIO   | 2      | `test_usuario`  | test_usuario@cujae.test    | `Test1234!`   |
| CONSEJO   | 3      | `test_consejo`  | test_consejo@cujae.test    | `Test1234!`   |
| AUTOR     | 4      | `test_autor`    | test_autor@cujae.test      | `Test1234!`   |
| PUBLICADOR| 5      | `test_publicador` | test_publicador@cujae.test | `Test1234!` |

\* Si la tabla `integrant` **no** tiene columna `password_hash` o está vacía, el login solo valida que exista el `user_name` (cualquier contraseña en el body es aceptada). Tras ejecutar `bd/seed_test_users_by_role.sql` con hash configurado, usar `Test1234!`.

---

## Ejemplo rápido (ADMIN)

```http
POST http://127.0.0.1:8000/auth/login
Content-Type: application/json

{
  "user_name": "test_admin",
  "password": "Test1234!"
}
```

---

## Cómo crear o actualizar estos usuarios

### Opción A — API (servidor corriendo)

```bash
python scripts/seed_test_users_api.py
```

Crea cada integrante con `POST /integrants/` y asigna el rol en `roles_list`.

### Opción B — SQL directo en PostgreSQL

```bash
psql -d sistema_unificado_c_c_q -f bd/seed_test_users_by_role.sql
```

Idempotente: no duplica `user_name` ni la relación en `integrant_role`.

---

## Nombres mostrados en el sistema

| user_name       | Nombre visible              |
|----------------|-----------------------------|
| test_admin     | Usuario Prueba ADMIN        |
| test_usuario   | Usuario Prueba USUARIO      |
| test_consejo   | Usuario Prueba CONSEJO      |
| test_autor     | Usuario Prueba AUTOR        |
| test_publicador| Usuario Prueba PUBLICADOR   |

---

## Notas

- Son cuentas **solo para desarrollo/pruebas**. No usar en producción.
- Todos tienen `external: false`.
- Para registrar uno nuevo manualmente: `POST /auth/register` con `user_name`, `email`, `password`, `name`, `role_ids`.
