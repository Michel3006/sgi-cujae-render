# modelo_api (FastAPI + LM Studio)

Backend listo para conectarse al servidor de inferencia de LM Studio (API compatible con OpenAI) y exponer endpoints para preguntar al modelo y recibir respuestas (incluye streaming SSE).

## Requisitos
- Python 3.11+
- LM Studio con el servidor de inferencia iniciado (por defecto: `http://localhost:1234/v1`)

## Instalación (Windows PowerShell)
```powershell
cd D:\SCHOOL\TESIS\Backend\modelo_api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Variables de entorno
Crea un archivo `.env` en la raíz con, por ejemplo:
```
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=
DEFAULT_MODEL=local-model
APP_NAME=modelo_api
API_PREFIX=/api
ENABLE_CORS=true
```

## Ejecutar el servidor
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger UI: `http://localhost:8000/docs`

## Endpoints principales
- GET `{API_PREFIX}/health` → estado del backend
- GET `{API_PREFIX}/models` → lista los modelos que expone LM Studio
- POST `{API_PREFIX}/chat` → respuesta completa (no streaming)
- POST `{API_PREFIX}/chat/stream` → streaming SSE (Server-Sent Events)

### Ejemplos
POST chat (no streaming):
```json
POST /api/chat
{
  "model": "local-model",
  "messages": [
    {"role": "system", "content": "Eres un asistente útil."},
    {"role": "user", "content": "¿Cuál es la capital de Perú?"}
  ],
  "temperature": 0.7
}
```

POST chat (streaming SSE):
```json
POST /api/chat/stream
{
  "model": "local-model",
  "messages": [
    {"role": "user", "content": "Resume esto en 3 puntos: ..."}
  ],
  "stream": true
}
```
La respuesta es `text/event-stream` (líneas con formato `data: ...`).

## Notas
- Asegúrate de tener cargado un modelo en LM Studio y el servidor de inferencia activo.
- Si configuras API Key en LM Studio, establece `LM_STUDIO_API_KEY` en `.env`.

