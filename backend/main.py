# main.py
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from modules.integrant import routes as integrant_routes
from modules.articles import routes as article_routes
from modules.article_type.routes import  router as article_type_router
from modules.auth import routes as auth_router
from modules.roles.models import Role
from modules.country import routes as countries_routes
from modules.faculty import routes as faculty_routes  
from modules.faculty_area.routes import router as faculty_areas_router 
from modules.docent_degree.routes import router as docent_degree_router 
from modules.book.routes import router as book_router 
from modules.general_category.routes import router as general_category_router
from modules.cientific_degree.routes import router as cientific_degree_router 
from modules.encounter_type.routes import router as encounter_type_router 
from modules.encounter.routes import router as encounter_router 
from modules.evaluation.routes import router as evaluation_router 
from modules.integrant_group_evaluation.routes import router as integrant_group_evaluation_router
from modules.monographs.routes import router as monographs_router 
from modules.norm.routes import router as norm_router 
from modules.norm_type.routes import router as norm_type_router 
from modules.patent.routes import router as patent_router 
from modules.software.routes import router as software_router 
from modules.theses.routes import router as theses_router 
from modules.theses_type.routes import router as theses_type_router 
from modules.group.routes import router as group_router 
from modules.project_classification.routes import router as project_classification_router 
from modules.project_state.routes import router as project_state_router 
from modules.project_type.routes import router as project_type_router 
from modules.project.routes import router as project_router 
from modules.research_task.routes import router as research_task_router
from modules.research_task_state.routes import router as research_task_state_router

from modules.roles.routes import router as roles_router
from modules.prizes.routes import router as prizes_router
from modules.prizes_type.routes import router as prizes_type_router
from modules.traces.routes import router as traces_router
from modules.zenodo.routes import router as zenodo_router
from modules.zenodo import models as zenodo_models  # noqa: F401 — registra el modelo en Base.metadata
from fastapi.middleware.cors import CORSMiddleware
from core.exception_handlers import register_exception_handlers
# Crear tablas (solo si no existen)
Base.metadata.create_all(bind=engine)


app = FastAPI(debug=True)
register_exception_handlers(app)
_cors_origins = os.getenv("BACKEND_CORS_ORIGINS", os.getenv("CORS_ORIGINS", "http://localhost:5173"))
allow_origins = ["*"] if _cors_origins.strip() == "*" else [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/")
def root():
    return {"mensaje": "Conectado a base de datos local"}

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(traces_router)
app.include_router(zenodo_router)
app.include_router(prizes_router)
app.include_router(prizes_type_router)
app.include_router(roles_router)
app.include_router(project_router)
app.include_router(research_task_router)
app.include_router(research_task_state_router)
app.include_router(project_state_router)
app.include_router(project_type_router)

app.include_router(group_router)
app.include_router(project_classification_router)
app.include_router(theses_type_router)
app.include_router(theses_router)
app.include_router(article_type_router)
app.include_router(software_router)
app.include_router(patent_router)
app.include_router(norm_router)
app.include_router(norm_type_router)
app.include_router(monographs_router)
app.include_router(encounter_type_router)
app.include_router(encounter_router)
app.include_router(evaluation_router)
app.include_router(integrant_group_evaluation_router)
app.include_router(faculty_routes.router)
app.include_router(countries_routes.router)
app.include_router(integrant_routes.router)
app.include_router(article_routes.router)
app.include_router(auth_router.router)
app.include_router(faculty_areas_router) 
app.include_router(docent_degree_router) 
app.include_router(book_router) 
app.include_router(general_category_router) 
app.include_router(cientific_degree_router) 

# Servir frontend estático (SPA) — se evalúa DESPUÉS de todas las rutas de API
frontend_static_dir = os.getenv("FRONTEND_STATIC_DIR", "/app/backend/static")
if os.path.isdir(frontend_static_dir):
    app.mount("/", StaticFiles(directory=frontend_static_dir, html=True), name="static")