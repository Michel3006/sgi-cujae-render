"""
Crea usuarios de prueba (uno por rol) vía API REST.
Uso: python scripts/seed_test_users_api.py
Requiere el servidor en http://127.0.0.1:8000
"""
import json
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

TEST_USERS = [
    {"user_name": "test_admin", "name": "Usuario Prueba ADMIN", "email": "test_admin@cujae.test", "role_id": 1, "role_name": "ADMIN"},
    {"user_name": "test_usuario", "name": "Usuario Prueba USUARIO", "email": "test_usuario@cujae.test", "role_id": 2, "role_name": "USUARIO"},
    {"user_name": "test_consejo", "name": "Usuario Prueba CONSEJO", "email": "test_consejo@cujae.test", "role_id": 3, "role_name": "CONSEJO"},
    {"user_name": "test_autor", "name": "Usuario Prueba AUTOR", "email": "test_autor@cujae.test", "role_id": 4, "role_name": "AUTOR"},
    {"user_name": "test_publicador", "name": "Usuario Prueba PUBLICADOR", "email": "test_publicador@cujae.test", "role_id": 5, "role_name": "PUBLICADOR"},
]


def request(method: str, path: str, body: dict | None = None) -> tuple[int, dict | str]:
    data = None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload


def find_integrant_by_username(user_name: str) -> int | None:
    status, payload = request("GET", f"/integrants/?search={user_name}&limit=100")
    if status != 200 or not isinstance(payload, list):
        return None
    for item in payload:
        if item.get("user_name") == user_name:
            return item["id_integrant"]
    return None


def main() -> None:
    for user in TEST_USERS:
        existing_id = find_integrant_by_username(user["user_name"])
        if existing_id:
            integrant_id = existing_id
            print(f"[exists] {user['user_name']} -> id {integrant_id}")
        else:
            body = {
                "name": user["name"],
                "external": False,
                "email": user["email"],
                "user_name": user["user_name"],
                "roles_list": [user["role_id"]],
            }
            status, payload = request("POST", "/integrants/", body)
            if status not in (200, 201):
                print(f"[error] POST {user['user_name']}: {status} {payload}")
                continue
            integrant_id = payload["id_integrant"]
            print(f"[created] {user['user_name']} -> id {integrant_id} rol {user['role_name']}")

        # Asegurar rol (por si el integrante existía sin rol)
        get_status, detail = request("GET", f"/integrants/{integrant_id}")
        if get_status == 200 and isinstance(detail, dict):
            role_ids = [r["id_rol"] for r in detail.get("roles", [])]
            if user["role_id"] not in role_ids:
                body = detail.copy()
                body["roles_list"] = list(set(role_ids + [user["role_id"]]))
                for k in ("id_integrant", "country", "docent_degree", "cientific_degree", "faculty", "faculty_area", "general_category", "roles"):
                    body.pop(k, None)
                request("PUT", f"/integrants/{integrant_id}", body)

    print("\nListo. Ver docs/USUARIOS_PRUEBA_ROLES.md")


if __name__ == "__main__":
    main()
