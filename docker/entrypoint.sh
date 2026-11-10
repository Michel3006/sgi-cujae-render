#!/bin/bash
set -euo pipefail

export PGDATA="${PGDATA:-/var/lib/postgresql/data}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-sgi_secret}"
export POSTGRES_DB="${POSTGRES_DB:-sistema_unificado_c_c_q}"

DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"
export DATABASE_URL

mkdir -p /var/lib/postgresql/data /var/run/postgresql /var/log/supervisor
chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo ">> Inicializando PostgreSQL..."
  su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA --encoding=UTF8 --locale=C.UTF-8"
  echo "host all all 127.0.0.1/32 scram-sha-256" >> "$PGDATA/pg_hba.conf"
  echo "host all all ::1/128 scram-sha-256" >> "$PGDATA/pg_hba.conf"
fi

start_postgres() {
  if su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
    return 0
  fi
  echo ">> Arrancando PostgreSQL temporalmente..."
  su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -w start -o \"-c listen_addresses='127.0.0.1'\""
}

stop_postgres() {
  if su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -m fast -w stop"
  fi
}

wait_postgres() {
  for _ in $(seq 1 30); do
    if su - postgres -c "pg_isready -q"; then
      return 0
    fi
    sleep 1
  done
  echo "ERROR: PostgreSQL no respondió a tiempo"
  exit 1
}

start_postgres
wait_postgres

echo ">> Configurando contraseña del usuario ${POSTGRES_USER}..."
su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}' SUPERUSER;\""

if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'\"" | grep -q 1; then
  echo ">> Creando base de datos ${POSTGRES_DB}..."
  su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};\""
fi

TABLE_COUNT="$(su - postgres -c "psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -tAc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"" 2>/dev/null || echo "0")"
if [ "${TABLE_COUNT}" = "0" ] || [ "${TABLE_COUNT}" = "" ]; then
  echo ">> Restaurando esquema y datos desde db/sgi_database.sql (puede tardar unos minutos)..."
  if head -c 5 /app/db/sgi_database.sql | grep -q "PGDMP"; then
    su - postgres -c "pg_restore -U ${POSTGRES_USER} -d ${POSTGRES_DB} --no-owner --no-acl /app/db/sgi_database.sql" || true
  else
    su - postgres -c "psql -v ON_ERROR_STOP=0 -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /app/db/sgi_database.sql" || true
  fi
  echo ">> Restauración completada."
else
  echo ">> Base de datos ya contiene ${TABLE_COUNT} tablas; se omite la restauración."
fi

stop_postgres

cat > /app/backend/.env <<EOF
APP_NAME=Sistema de Gestión
DATABASE_URL=${DATABASE_URL}
UPLOAD_DIR=/app/backend/uploads
ZENODO_API_URL=${ZENODO_API_URL:-https://sandbox.zenodo.org}
ZENODO_ACCESS_TOKEN=${ZENODO_ACCESS_TOKEN:-}
LDAP_ENABLED=${LDAP_ENABLED:-true}
LDAP_HOST=${LDAP_HOST:-10.8.1.125}
LDAP_PORT=${LDAP_PORT:-636}
LDAP_USE_SSL=${LDAP_USE_SSL:-true}
LDAP_BIND_DN=${LDAP_BIND_DN:-}
LDAP_BIND_PASSWORD=${LDAP_BIND_PASSWORD:-}
LDAP_BASE_DN=${LDAP_BASE_DN:-dc=cujae,dc=edu,dc=cu}
LDAP_VALIDATE_CERT=${LDAP_VALIDATE_CERT:-false}
CORS_ORIGINS=${BACKEND_CORS_ORIGINS:-*}
BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS:-*}
EOF

cat > /app/model/.env <<EOF
LM_STUDIO_BASE_URL=${LM_STUDIO_BASE_URL:-http://host.docker.internal:1234/v1}
LM_STUDIO_API_KEY=${LM_STUDIO_API_KEY:-}
DEFAULT_MODEL=${DEFAULT_MODEL:-local-model}
APP_NAME=modelo_api
API_PREFIX=/api
ENABLE_CORS=true
DATABASE_URL=${DATABASE_URL}
SQL_SCHEMA_CONTEXT_PATH=/app/model/schema_context.txt
SQL_MAX_ROWS=${SQL_MAX_ROWS:-100}
ASK_DATA_MAX_ROWS_IN_PROMPT=${ASK_DATA_MAX_ROWS_IN_PROMPT:-50}
EOF

mkdir -p /app/backend/uploads
echo ">> Configuración modelo IA (inferencia externa):"
echo "   LM_STUDIO_BASE_URL=${LM_STUDIO_BASE_URL:-http://host.docker.internal:1234/v1}"
echo "   DEFAULT_MODEL=${DEFAULT_MODEL:-local-model}"
echo "   API modelo expuesta en puerto 8001 (mapeado desde MODEL_API_PORT en el host)"
echo ">> Configuración LDAP: host=${LDAP_HOST:-10.8.1.125} port=${LDAP_PORT:-636}"
echo ">> Iniciando servicios (PostgreSQL, backend, modelo, nginx)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
