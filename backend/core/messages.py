"""Traducción de mensajes de error al español para respuestas al frontend."""
from __future__ import annotations

import re
from typing import Any

# Mensajes literales exactos (inglés -> español)
LITERAL_TRANSLATIONS: dict[str, str] = {
    "Not authenticated": "No autenticado",
    "Could not validate credentials": "No se pudieron validar las credenciales",
    "El usuario existe en LDAP pero no está registrado en el sistema": "El usuario existe en LDAP pero no está registrado en el sistema",
    "El usuario no tiene perfil de trabajador en el directorio CUJAE": "El usuario no tiene perfil de trabajador en el directorio CUJAE",
    "El usuario no tiene roles asignados en el sistema": "El usuario no tiene roles asignados en el sistema",
    "LDAP no está configurado en el servidor": "LDAP no está configurado en el servidor",
    "Credenciales de servicio LDAP no configuradas": "Credenciales de servicio LDAP no configuradas",
    "Incorrect username or password": "Usuario o contraseña incorrectos",
    "Email already registered": "El correo electrónico ya está registrado",
    "Username already registered": "El nombre de usuario ya está registrado",
    "Internal server error": "Error interno del servidor",
    "Invalid token": "Token inválido",
    "User not found": "Usuario no encontrado",
    "Invalid authorization header": "Encabezado de autorización inválido",
    "Article not found": "Artículo no encontrado",
    "Book not found": "Libro no encontrado",
    "Encounter not found": "Evento científico no encontrado",
    "Monograph not found": "Monografía no encontrada",
    "Norm not found": "Norma no encontrada",
    "Patent not found": "Patente no encontrada",
    "Prize not found": "Premio no encontrado",
    "Software not found": "Software no encontrado",
    "Thesis not found": "Tesis no encontrada",
    "Integrant not found": "Integrante no encontrado",
    "Project not found": "Proyecto no encontrado",
    "Group not found": "Grupo no encontrado",
    "Country not found": "País no encontrado",
    "Faculty not found": "Facultad no encontrada",
    "Faculty area not found": "Área de facultad no encontrada",
    "Role not found": "Rol no encontrado",
    "Trace not found": "Traza no encontrada",
    "Evaluation not found": "Evaluación no encontrada",
    "Article type not found": "Tipo de artículo no encontrado",
    "Encounter type not found": "Tipo de evento no encontrado",
    "Norm type not found": "Tipo de norma no encontrado",
    "Prize type not found": "Tipo de premio no encontrado",
    "Thesis type not found": "Tipo de tesis no encontrado",
    "Project type not found": "Tipo de proyecto no encontrado",
    "Project state not found": "Estado de proyecto no encontrado",
    "Project classification not found": "Clasificación de proyecto no encontrada",
    "Cientific degree not found": "Grado científico no encontrado",
    "Docent degree not found": "Grado docente no encontrado",
    "General category not found": "Categoría general no encontrada",
    "Research task not found": "Tarea de investigación no encontrada",
    "Research task state not found": "Estado de tarea de investigación no encontrado",
    "Integrant group evaluation not found": "Evaluación de integrante en grupo no encontrada",
    "An article with the same DOI or ISSN already exists": "Ya existe un artículo con el mismo DOI o ISSN",
    "An encounter with the same ISBN or ISSN already exists": "Ya existe un evento con el mismo ISBN o ISSN",
    "A book with this ISBN already exists": "Ya existe un libro con este ISBN",
    "Invalid author entry in author_ids": "Entrada de autor inválida en author_ids",
    "Invalid entry in author_ids: must be int or NewAuthor": "Entrada inválida en author_ids: debe ser int o NewAuthor",
    "Invalid entry in tutor_ids: must be int or NewAuthor": "Entrada inválida en tutor_ids: debe ser int o NewAuthor",
    "Invalid entry in member_ids: must be int or NewIntegrant": "Entrada inválida en member_ids: debe ser int o NewIntegrant",
    "Invalid type for id_responsible": "Tipo inválido para id_responsible",
    "Invalid type for id_admin: must be int or NewIntegrant": "Tipo inválido para id_admin: debe ser int o NewIntegrant",
    "One or more existing author IDs do not exist": "Uno o más IDs de autores no existen",
    "One or more author IDs do not exist": "Uno o más IDs de autores no existen",
    "One or more existing member IDs do not exist": "Uno o más IDs de miembros no existen",
    "One or more author/tutor IDs do not exist": "Uno o más IDs de autores/tutores no existen",
    "Field required": "Campo obligatorio",
    "value is not a valid email address": "no es un correo electrónico válido",
    "Input should be a valid integer": "Debe ser un número entero válido",
    "Input should be a valid string": "Debe ser una cadena de texto válida",
    "Input should be a valid boolean": "Debe ser un valor booleano válido",
    "Input should be a valid date": "Debe ser una fecha válida",
    "Input should be a valid dictionary or object to extract fields from": "Debe ser un objeto JSON válido",
    "JSON decode error": "Error al decodificar JSON",
}

# Patrones dinámicos (regex, plantilla español con grupos)
PATTERN_TRANSLATIONS: list[tuple[str, str]] = [
    (r"Country with id (\S+) does not exist", r"El país con id \1 no existe"),
    (r"Article type with id (\S+) does not exist", r"El tipo de artículo con id \1 no existe"),
    (r"Encounter type with id (\S+) does not exist", r"El tipo de evento con id \1 no existe"),
    (r"Norm type with id (\S+) does not exist", r"El tipo de norma con id \1 no existe"),
    (r"Prize type with id (\S+) does not exist", r"El tipo de premio con id \1 no existe"),
    (r"Thesis type with id (\S+) does not exist", r"El tipo de tesis con id \1 no existe"),
    (r"Docent degree with id (\S+) does not exist", r"El grado docente con id \1 no existe"),
    (r"Cientific degree with id (\S+) does not exist", r"El grado científico con id \1 no existe"),
    (r"Faculty with id (\S+) does not exist", r"La facultad con id \1 no existe"),
    (r"Faculty area with id (\S+) does not exist", r"El área de facultad con id \1 no existe"),
    (r"General category with id (\S+) does not exist", r"La categoría general con id \1 no existe"),
    (r"Role with id (\S+) does not exist", r"El rol con id \1 no existe"),
    (r"Project type id (\S+) does not exist", r"El tipo de proyecto con id \1 no existe"),
    (r"Project state id (\S+) does not exist", r"El estado de proyecto con id \1 no existe"),
    (r"Project classification id (\S+) does not exist", r"La clasificación de proyecto con id \1 no existe"),
    (r"Faculty id (\S+) does not exist", r"La facultad con id \1 no existe"),
    (r"Responsible integrant id (\S+) does not exist", r"El integrante responsable con id \1 no existe"),
    (r"Leader \(integrant id (\S+)\) does not exist", r"El líder (integrante id \1) no existe"),
    (r"Leader integrant id (\S+) does not exist", r"El integrante líder con id \1 no existe"),
    (r"Project id (\S+) does not exist", r"El proyecto con id \1 no existe"),
    (r"Research task state id (\S+) does not exist", r"El estado de tarea con id \1 no existe"),
    (r"Username '(.+)' is already registered", r"El nombre de usuario '\1' ya está registrado"),
    (r"The following integrant IDs do not exist: (.+)", r"Los siguientes IDs de integrantes no existen: \1"),
    (r"Role with id (\S+) does not exist", r"El rol con id \1 no existe"),
    (r"Role with id_rol (\S+) already exists", r"Ya existe un rol con id_rol \1"),
]

PYDANTIC_MSG_TRANSLATIONS: dict[str, str] = {
    "Field required": "Campo obligatorio",
    "Extra inputs are not permitted": "No se permiten campos adicionales",
    "Input should be a valid integer": "Debe ser un número entero válido",
    "Input should be a valid string": "Debe ser una cadena de texto válida",
    "Input should be a valid boolean": "Debe ser un valor booleano válido",
    "Input should be a valid date": "Debe ser una fecha válida",
    "Input should be a valid datetime": "Debe ser una fecha y hora válidas",
    "Input should be a valid list": "Debe ser una lista válida",
    "value is not a valid email address": "no es un correo electrónico válido",
    "String should have at least 1 character": "La cadena debe tener al menos 1 carácter",
}


def translate_text(text: str) -> str:
    if not text:
        return text
    if text in LITERAL_TRANSLATIONS:
        return LITERAL_TRANSLATIONS[text]
    for pattern, replacement in PATTERN_TRANSLATIONS:
        if re.fullmatch(pattern, text) or re.search(pattern, text):
            new_text = re.sub(pattern, replacement, text)
            if new_text != text:
                return new_text
    return text


def translate_detail(detail: Any) -> Any:
    if detail is None:
        return detail
    if isinstance(detail, str):
        return translate_text(detail)
    if isinstance(detail, list):
        return [translate_detail(item) for item in detail]
    if isinstance(detail, dict):
        translated = {}
        for key, value in detail.items():
            if key in ("message", "msg") and isinstance(value, str):
                translated[key] = translate_text(value)
            elif key == "errors" and isinstance(value, list):
                translated[key] = [
                    {k: translate_text(v) if k == "message" and isinstance(v, str) else v for k, v in err.items()}
                    if isinstance(err, dict)
                    else err
                    for err in value
                ]
            else:
                translated[key] = translate_detail(value)
        return translated
    return detail


def translate_validation_error(error: dict) -> dict:
    translated = dict(error)
    msg = translated.get("msg")
    if isinstance(msg, str):
        translated["msg"] = PYDANTIC_MSG_TRANSLATIONS.get(msg, translate_text(msg))
    if translated.get("type") == "json_invalid":
        translated["msg"] = "Error al decodificar JSON"
    ctx = translated.get("ctx")
    if isinstance(ctx, dict) and "error" in ctx and isinstance(ctx["error"], str):
        ctx = dict(ctx)
        ctx["error"] = translate_text(ctx["error"])
        translated["ctx"] = ctx
    return translated
