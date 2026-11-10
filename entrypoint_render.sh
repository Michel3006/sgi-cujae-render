#!/bin/bash
set -euo pipefail

###############################################################################
# entrypoint_render.sh — Punto de entrada para despliegue en Render
# 1. Genera .env del backend con variables de Render
# 2. Ejecuta script Python para crear tablas y usuario admin
# 3. Inicia uvicorn en el puerto $PORT
###############################################################################

echo ">> Generando .env del backend para Render..."

cat > /app/backend/.env <<EOF
APP_NAME=Sistema de Gestión
DATABASE_URL=${DATABASE_URL}
UPLOAD_DIR=/app/backend/uploads
ZENODO_API_URL=${ZENODO_API_URL:-https://sandbox.zenodo.org}
ZENODO_ACCESS_TOKEN=${ZENODO_ACCESS_TOKEN:-}
LDAP_ENABLED=${LDAP_ENABLED:-false}
LDAP_HOST=${LDAP_HOST:-10.8.1.125}
LDAP_PORT=${LDAP_PORT:-636}
LDAP_USE_SSL=${LDAP_USE_SSL:-true}
LDAP_BIND_DN=${LDAP_BIND_DN:-}
LDAP_BIND_PASSWORD=${LDAP_BIND_PASSWORD:-}
LDAP_BASE_DN=${LDAP_BASE_DN:-dc=cujae,dc=edu,dc=cu}
LDAP_VALIDATE_CERT=${LDAP_VALIDATE_CERT:-false}
CORS_ORIGINS=${BACKEND_CORS_ORIGINS:-*}
BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS:*}
SECRET_KEY=${SECRET_KEY:-sgi_clave_secreta_entorno_prueba_render}
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
SQL_MAX_ROWS=${SQL_MAX_ROWS:-100}
ASK_DATA_MAX_ROWS_IN_PROMPT=${ASK_DATA_MAX_ROWS_IN_PROMPT:-50}
EOF

echo ">> .env generado."

echo ">> Ejecutando setup de base de datos y usuario admin..."
cd /app/backend
python setup_render.py

echo ">> Iniciando uvicorn en puerto ${PORT:-8000}..."
exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
