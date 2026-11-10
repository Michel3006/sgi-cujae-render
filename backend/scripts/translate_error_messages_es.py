"""Reemplaza mensajes de error en inglés por español en el código fuente."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REPLACEMENTS = [
    ('detail="Error interno del servidor"', 'detail="Error interno del servidor"'),
    ('detail="Usuario o contraseña incorrectos"', 'detail="Usuario o contraseña incorrectos"'),
    ('detail="El correo electrónico ya está registrado"', 'detail="El correo electrónico ya está registrado"'),
    ('detail="El nombre de usuario ya está registrado"', 'detail="El nombre de usuario ya está registrado"'),
    ('detail="No se pudieron validar las credenciales"', 'detail="No se pudieron validar las credenciales"'),
    ('detail="Token inválido"', 'detail="Token inválido"'),
    ('detail="Usuario no encontrado"', 'detail="Usuario no encontrado"'),
    ('detail="Encabezado de autorización inválido"', 'detail="Encabezado de autorización inválido"'),
    ('detail="Artículo no encontrado"', 'detail="Artículo no encontrado"'),
    ('detail="Libro no encontrado"', 'detail="Libro no encontrado"'),
    ('detail="Evento científico no encontrado"', 'detail="Evento científico no encontrado"'),
    ('detail="Monografía no encontrada"', 'detail="Monografía no encontrada"'),
    ('detail="Norma no encontrada"', 'detail="Norma no encontrada"'),
    ('detail="Patente no encontrada"', 'detail="Patente no encontrada"'),
    ('detail="Premio no encontrado"', 'detail="Premio no encontrado"'),
    ('detail="Software no encontrado"', 'detail="Software no encontrado"'),
    ('detail="Tesis no encontrada"', 'detail="Tesis no encontrada"'),
    ('detail="Integrante no encontrado"', 'detail="Integrante no encontrado"'),
    ('detail="Proyecto no encontrado"', 'detail="Proyecto no encontrado"'),
    ('detail="Grupo no encontrado"', 'detail="Grupo no encontrado"'),
    ('detail="País no encontrado"', 'detail="País no encontrado"'),
    ('detail="Facultad no encontrada"', 'detail="Facultad no encontrada"'),
    ('detail="Área de facultad no encontrada"', 'detail="Área de facultad no encontrada"'),
    ('detail="Rol no encontrado"', 'detail="Rol no encontrado"'),
    ('detail="Traza no encontrada"', 'detail="Traza no encontrada"'),
    ('detail="Evaluación no encontrada"', 'detail="Evaluación no encontrada"'),
    ('detail="Tipo de artículo no encontrado"', 'detail="Tipo de artículo no encontrado"'),
    ('detail="Tipo de evento no encontrado"', 'detail="Tipo de evento no encontrado"'),
    ('detail="Tipo de norma no encontrado"', 'detail="Tipo de norma no encontrado"'),
    ('detail="Tipo de premio no encontrado"', 'detail="Tipo de premio no encontrado"'),
    ('detail="Tipo de tesis no encontrado"', 'detail="Tipo de tesis no encontrado"'),
    ('detail="Tipo de proyecto no encontrado"', 'detail="Tipo de proyecto no encontrado"'),
    ('detail="Estado de proyecto no encontrado"', 'detail="Estado de proyecto no encontrado"'),
    ('detail="Clasificación de proyecto no encontrada"', 'detail="Clasificación de proyecto no encontrada"'),
    ('detail="Grado científico no encontrado"', 'detail="Grado científico no encontrado"'),
    ('detail="Grado docente no encontrado"', 'detail="Grado docente no encontrado"'),
    ('detail="Categoría general no encontrada"', 'detail="Categoría general no encontrada"'),
    ('detail="Tarea de investigación no encontrada"', 'detail="Tarea de investigación no encontrada"'),
    ('detail="Estado de tarea de investigación no encontrado"', 'detail="Estado de tarea de investigación no encontrado"'),
    ('detail="Evaluación de integrante en grupo no encontrada"', 'detail="Evaluación de integrante en grupo no encontrada"'),
    ('detail="Ya existe un artículo con el mismo DOI o ISSN"', 'detail="Ya existe un artículo con el mismo DOI o ISSN"'),
    ('detail="Ya existe un evento con el mismo ISBN o ISSN"', 'detail="Ya existe un evento con el mismo ISBN o ISSN"'),
    ('detail="Ya existe un libro con este ISBN"', 'detail="Ya existe un libro con este ISBN"'),
    ('detail=f"La facultad con id {area.id_faculty} no existe"', 'detail=f"La facultad con id {area.id_faculty} no existe"'),
    ('detail=f"Faculty with id {update_data[\'id_faculty\']} does not exist"', 'detail=f"La facultad con id {update_data[\'id_faculty\']} no existe"'),
    ('raise ValueError(f"El país con id {integrant.id_country} no existe")', 'raise ValueError(f"El país con id {integrant.id_country} no existe")'),
    ('raise ValueError(f"Country with id {update_data[\'id_country\']} does not exist")', 'raise ValueError(f"El país con id {update_data[\'id_country\']} no existe")'),
    ('raise ValueError(f"El país con id {article.id_country} no existe")', 'raise ValueError(f"El país con id {article.id_country} no existe")'),
    ('raise ValueError(f"El país con id {book.id_country} no existe")', 'raise ValueError(f"El país con id {book.id_country} no existe")'),
    ('raise ValueError(f"El país con id {encounter.id_country} no existe")', 'raise ValueError(f"El país con id {encounter.id_country} no existe")'),
    ('raise ValueError(f"El país con id {norm.id_country} no existe")', 'raise ValueError(f"El país con id {norm.id_country} no existe")'),
    ('raise ValueError(f"El país con id {patent.id_country} no existe")', 'raise ValueError(f"El país con id {patent.id_country} no existe")'),
    ('raise ValueError(f"El país con id {prize.id_country} no existe")', 'raise ValueError(f"El país con id {prize.id_country} no existe")'),
    ('raise ValueError(f"El país con id {software.id_country} no existe")', 'raise ValueError(f"El país con id {software.id_country} no existe")'),
    ('raise ValueError(f"El país con id {thesis.id_country} no existe")', 'raise ValueError(f"El país con id {thesis.id_country} no existe")'),
    ('raise ValueError(f"El país con id {monograph.id_country} no existe")', 'raise ValueError(f"El país con id {monograph.id_country} no existe")'),
    ('raise ValueError(f"El país con id {country_id} no existe")', 'raise ValueError(f"El país con id {country_id} no existe")'),
    ('raise ValueError(f"Country with id {data[\'id_country\']} does not exist")', 'raise ValueError(f"El país con id {data[\'id_country\']} no existe")'),
    ('raise ValueError(f"El tipo de artículo con id {article.id_article_type} no existe")', 'raise ValueError(f"El tipo de artículo con id {article.id_article_type} no existe")'),
    ('raise ValueError(f"Article type with id {update_data[\'id_article_type\']} does not exist")', 'raise ValueError(f"El tipo de artículo con id {update_data[\'id_article_type\']} no existe")'),
    ('raise ValueError(f"Article type with id {data[\'id_article_type\']} does not exist")', 'raise ValueError(f"El tipo de artículo con id {data[\'id_article_type\']} no existe")'),
    ('raise ValueError(f"El tipo de evento con id {encounter.id_encounter_type} no existe")', 'raise ValueError(f"El tipo de evento con id {encounter.id_encounter_type} no existe")'),
    ('raise ValueError(f"Encounter type with id {data[\'id_encounter_type\']} does not exist")', 'raise ValueError(f"El tipo de evento con id {data[\'id_encounter_type\']} no existe")'),
    ('raise ValueError(f"El tipo de norma con id {norm.id_norm_type} no existe")', 'raise ValueError(f"El tipo de norma con id {norm.id_norm_type} no existe")'),
    ('raise ValueError(f"Norm type with id {data[\'id_norm_type\']} does not exist")', 'raise ValueError(f"El tipo de norma con id {data[\'id_norm_type\']} no existe")'),
    ('raise ValueError(f"El tipo de premio con id {prize.id_prize_type} no existe")', 'raise ValueError(f"El tipo de premio con id {prize.id_prize_type} no existe")'),
    ('raise ValueError(f"Prize type with id {data[\'id_prize_type\']} does not exist")', 'raise ValueError(f"El tipo de premio con id {data[\'id_prize_type\']} no existe")'),
    ('raise ValueError(f"El tipo de tesis con id {thesis.id_thesis_type} no existe")', 'raise ValueError(f"El tipo de tesis con id {thesis.id_thesis_type} no existe")'),
    ('raise ValueError(f"Thesis type with id {data[\'id_thesis_type\']} does not exist")', 'raise ValueError(f"El tipo de tesis con id {data[\'id_thesis_type\']} no existe")'),
    ('raise ValueError(f"El grado docente con id {integrant.id_docent_degree} no existe")', 'raise ValueError(f"El grado docente con id {integrant.id_docent_degree} no existe")'),
    ('raise ValueError(f"Docent degree with id {update_data[\'id_docent_degree\']} does not exist")', 'raise ValueError(f"El grado docente con id {update_data[\'id_docent_degree\']} no existe")'),
    ('raise ValueError(f"El grado científico con id {integrant.id_cientific_degree} no existe")', 'raise ValueError(f"El grado científico con id {integrant.id_cientific_degree} no existe")'),
    ('raise ValueError(f"Cientific degree with id {update_data[\'id_cientific_degree\']} does not exist")', 'raise ValueError(f"El grado científico con id {update_data[\'id_cientific_degree\']} no existe")'),
    ('raise ValueError(f"La facultad con id {integrant.id_faculty} no existe")', 'raise ValueError(f"La facultad con id {integrant.id_faculty} no existe")'),
    ('raise ValueError(f"Faculty with id {update_data[\'id_faculty\']} does not exist")', 'raise ValueError(f"La facultad con id {update_data[\'id_faculty\']} no existe")'),
    ('raise ValueError(f"La facultad con id {group.id_faculty} no existe")', 'raise ValueError(f"La facultad con id {group.id_faculty} no existe")'),
    ('raise ValueError(f"Faculty with id {data[\'id_faculty\']} does not exist")', 'raise ValueError(f"La facultad con id {data[\'id_faculty\']} no existe")'),
    ('raise ValueError(f"El área de facultad con id {integrant.id_faculty_area} no existe")', 'raise ValueError(f"El área de facultad con id {integrant.id_faculty_area} no existe")'),
    ('raise ValueError(f"Faculty area with id {update_data[\'id_faculty_area\']} does not exist")', 'raise ValueError(f"El área de facultad con id {update_data[\'id_faculty_area\']} no existe")'),
    ('raise ValueError(f"El área de facultad con id {group.id_faculty_area} no existe")', 'raise ValueError(f"El área de facultad con id {group.id_faculty_area} no existe")'),
    ('raise ValueError(f"Faculty area with id {data[\'id_faculty_area\']} does not exist")', 'raise ValueError(f"El área de facultad con id {data[\'id_faculty_area\']} no existe")'),
    ('raise ValueError(f"La categoría general con id {integrant.id_general_category} no existe")', 'raise ValueError(f"La categoría general con id {integrant.id_general_category} no existe")'),
    ('raise ValueError(f"General category with id {update_data[\'id_general_category\']} does not exist")', 'raise ValueError(f"La categoría general con id {update_data[\'id_general_category\']} no existe")'),
    ('raise ValueError(f"El rol con id {role_id} no existe")', 'raise ValueError(f"El rol con id {role_id} no existe")'),
    ('raise ValueError(f"Username \'{integrant.user_name}\' is already registered")', 'raise ValueError(f"El nombre de usuario \'{integrant.user_name}\' ya está registrado")'),
    ('raise ValueError("Entrada de autor inválida en author_ids")', 'raise ValueError("Entrada de autor inválida en author_ids")'),
    ('raise ValueError("Entrada inválida en author_ids: debe ser int o NewAuthor")', 'raise ValueError("Entrada inválida en author_ids: debe ser int o NewAuthor")'),
    ('raise ValueError("Entrada inválida en tutor_ids: debe ser int o NewAuthor")', 'raise ValueError("Entrada inválida en tutor_ids: debe ser int o NewAuthor")'),
    ('raise ValueError("Entrada inválida en member_ids: debe ser int o NewIntegrant")', 'raise ValueError("Entrada inválida en member_ids: debe ser int o NewIntegrant")'),
    ('raise ValueError("Tipo inválido para id_responsible")', 'raise ValueError("Tipo inválido para id_responsible")'),
    ('raise ValueError("Tipo inválido para id_admin: debe ser int o NewIntegrant")', 'raise ValueError("Tipo inválido para id_admin: debe ser int o NewIntegrant")'),
    ('raise ValueError("Uno o más IDs de autores no existen")', 'raise ValueError("Uno o más IDs de autores no existen")'),
    ('raise ValueError("Uno o más IDs de autores no existen")', 'raise ValueError("Uno o más IDs de autores no existen")'),
    ('raise ValueError("Uno o más IDs de miembros no existen")', 'raise ValueError("Uno o más IDs de miembros no existen")'),
    ('raise ValueError("Uno o más IDs de autores/tutores no existen")', 'raise ValueError("Uno o más IDs de autores/tutores no existen")'),
    ('raise ValueError(f"El tipo de proyecto con id {project.id_project_type} no existe")', 'raise ValueError(f"El tipo de proyecto con id {project.id_project_type} no existe")'),
    ('raise ValueError(f"El estado de proyecto con id {project.id_project_state} no existe")', 'raise ValueError(f"El estado de proyecto con id {project.id_project_state} no existe")'),
    ('raise ValueError(f"La clasificación de proyecto con id {project.id_project_classification} no existe")', 'raise ValueError(f"La clasificación de proyecto con id {project.id_project_classification} no existe")'),
    ('raise ValueError(f"La facultad con id {project.id_faculty} no existe")', 'raise ValueError(f"La facultad con id {project.id_faculty} no existe")'),
    ('raise ValueError(f"El integrante responsable con id {project.id_responsible} no existe")', 'raise ValueError(f"El integrante responsable con id {project.id_responsible} no existe")'),
    ('raise ValueError(f"Responsible integrant id {data[\'id_responsible\']} does not exist")', 'raise ValueError(f"El integrante responsable con id {data[\'id_responsible\']} no existe")'),
    ('raise ValueError(f"El integrante responsable con id {task.id_responsible} no existe")', 'raise ValueError(f"El integrante responsable con id {task.id_responsible} no existe")'),
    ('raise ValueError(f"El líder (integrante id {group.id_admin}) no existe")', 'raise ValueError(f"El líder (integrante id {group.id_admin}) no existe")'),
    ('raise ValueError(f"Leader integrant id {data[\'id_admin\']} does not exist")', 'raise ValueError(f"El integrante líder con id {data[\'id_admin\']} no existe")'),
    ('raise ValueError(f"El proyecto con id {task.id_project} no existe")', 'raise ValueError(f"El proyecto con id {task.id_project} no existe")'),
    ('raise ValueError(f"Project id {data[\'id_project\']} does not exist")', 'raise ValueError(f"El proyecto con id {data[\'id_project\']} no existe")'),
    ('raise ValueError(f"El estado de tarea con id {task.id_research_task_state} no existe")', 'raise ValueError(f"El estado de tarea con id {task.id_research_task_state} no existe")'),
    ('raise ValueError(f"Research task state id {data[\'id_research_task_state\']} does not exist")', 'raise ValueError(f"El estado de tarea con id {data[\'id_research_task_state\']} no existe")'),
    ('raise ValueError(f"Los siguientes IDs de integrantes no existen: {missing}")', 'raise ValueError(f"Los siguientes IDs de integrantes no existen: {missing}")'),
    ('detail=f"El rol con id {role_id} no existe"', 'detail=f"El rol con id {role_id} no existe"'),
]


def main() -> None:
    count = 0
    for path in ROOT.rglob("*.py"):
        if "venv" in path.parts or "__pycache__" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf-8")
            count += 1
            print(path.relative_to(ROOT))
    print(f"Archivos actualizados: {count}")


if __name__ == "__main__":
    main()
