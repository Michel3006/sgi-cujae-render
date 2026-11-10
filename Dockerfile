# -----------------------------------------------------------------------------
# Etapa 1: compilar el frontend (React + Vite)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Rutas relativas al mismo host (nginx hace de proxy inverso)
ARG VITE_API_BASE_URL=/sgi-api
ARG VITE_CHAT_API_BASE_URL=/model-api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CHAT_API_BASE_URL=$VITE_CHAT_API_BASE_URL

RUN npx vite build

# -----------------------------------------------------------------------------
# Etapa 2: imagen final con todos los servicios
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PGDATA=/var/lib/postgresql/data \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=sgi_secret \
    POSTGRES_DB=sistema_unificado_c_c_q

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    postgresql \
    postgresql-contrib \
    locales \
    curl \
    && sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend primero; el modelo solo añade paquetes que no están en el backend
COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN sed -i 's/^psycopg2==/psycopg2-binary==/' /tmp/backend-requirements.txt \
    && pip install --no-cache-dir -r /tmp/backend-requirements.txt \
    && pip install --no-cache-dir asyncpg==0.29.0 "pydantic-settings>=2.2.1"

# Código de los proyectos
COPY backend/ /app/backend/
COPY model/ /app/model/
COPY db/ /app/db/

# Frontend compilado
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Configuración de despliegue
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh \
    && mkdir -p /app/backend/uploads /var/log/supervisor /var/log/nginx

EXPOSE 80 8000 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://127.0.0.1/sgi-api/ || curl -f http://127.0.0.1:8000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
