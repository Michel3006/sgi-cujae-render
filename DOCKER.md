# Despliegue Docker — SGI unificado

Una sola imagen incluye: **frontend**, **backend**, **modelo IA**, **PostgreSQL** y **nginx**.

| Componente | Puerto interno | Variable host | Por defecto |
|------------|----------------|---------------|-------------|
| Frontend + proxy nginx | 80 | `HTTP_PORT` | 8080 |
| Backend (FastAPI SGI) | 8000 | `BACKEND_PORT` | 8000 |
| API modelo IA (chat) | 8001 | `MODEL_API_PORT` | 8001 |
| PostgreSQL | 5432 | — | No expuesto |

Rutas vía nginx (puerto `HTTP_PORT`):

- `/` → frontend
- `/sgi-api/*` → backend
- `/model-api/*` → API del modelo (dentro del contenedor)

## Configuración para otra persona (sin tocar código)

1. Copia el archivo de ejemplo:

```powershell
copy .env.docker.example .env
```

2. Edita `.env` según el entorno. **Lo más importante para la IA:**

```env
# Dónde está LM Studio / Ollama / servidor OpenAI-compatible
LM_STUDIO_BASE_URL=http://192.168.1.50:1234/v1
DEFAULT_MODEL=meta-llama-3.1-8b-instruct
LM_STUDIO_API_KEY=

# Puertos si hay conflicto en el servidor destino
HTTP_PORT=8080
MODEL_API_PORT=8001
```

3. Levanta o reinicia (no hace falta rebuild solo por cambiar `.env`):

```powershell
docker compose up -d --force-recreate
```

### Ejemplos de `LM_STUDIO_BASE_URL`

| Escenario | Valor |
|-----------|--------|
| LM Studio en el mismo PC (Docker Desktop Win/Mac) | `http://host.docker.internal:1234/v1` |
| LM Studio en otra PC de la red | `http://IP_DE_ESA_PC:1234/v1` |
| Linux sin host.docker.internal | `http://172.17.0.1:1234/v1` o IP del host |

El **modelo de inferencia no va dentro de la imagen**; la API en el puerto 8001 consume el servidor externo configurado en `LM_STUDIO_BASE_URL`.

## Construir la imagen (incluye todos los cambios del código)

```powershell
cd d:\SCHOOL\TESIS\deploy-repo
docker compose build
docker compose up -d
```

Abre **http://localhost:8080** (o el `HTTP_PORT` que definas).

## Entregar la imagen a otra persona

### Opción A — Con el repositorio

Entrega el repo + instrucciones:

```powershell
copy .env.docker.example .env
# editar .env
docker compose up -d --build
```

### Opción B — Solo la imagen exportada

En tu máquina:

```powershell
docker compose build
docker save sgi-unificado:latest -o sgi-unificado.tar
```

En la máquina destino:

```powershell
docker load -i sgi-unificado.tar
```

Crea un `docker-compose.yml` y `.env` (usa `.env.docker.example` como plantilla) y ejecuta:

```powershell
docker compose up -d
```

## Variables de entorno completas

Ver `.env.docker.example`. Resumen:

| Variable | Uso |
|----------|-----|
| `HTTP_PORT` | Puerto web principal |
| `BACKEND_PORT` | Backend directo (debug) |
| `MODEL_API_PORT` | API modelo IA expuesta |
| `LM_STUDIO_BASE_URL` | **URL del servidor de inferencia** |
| `DEFAULT_MODEL` | Nombre del modelo en LM Studio |
| `LM_STUDIO_API_KEY` | API key si el servidor la exige |
| `LDAP_*` | Login con directorio CUJAE |
| `POSTGRES_*` | Base de datos interna |

## ¿Los cambios en el código se reflejan solos?

**No.** Debes reconstruir:

```powershell
docker compose build
docker compose up -d --force-recreate
```

Cambiar **solo** `.env` (LM Studio, LDAP, puertos) **no** requiere rebuild; basta `docker compose up -d --force-recreate`.

## Comandos útiles

```powershell
docker compose logs -f
docker compose logs -f sgi   # ver LM_STUDIO_BASE_URL al arrancar
docker compose down
docker compose down -v       # borra BD (¡cuidado!)
```

## Verificar modelo IA

```powershell
curl http://localhost:8080/model-api/api/health
curl http://localhost:8001/api/health
```

Si el chat falla pero health responde OK, revisa `LM_STUDIO_BASE_URL` y que LM Studio esté activo en esa URL.
