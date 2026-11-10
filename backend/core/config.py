# core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Sistema de Gestión")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    # Almacenamiento local de documentos (servidor CUJAE)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    # Zenodo
    ZENODO_API_URL: str = os.getenv("ZENODO_API_URL", "https://sandbox.zenodo.org")
    ZENODO_ACCESS_TOKEN: str = os.getenv("ZENODO_ACCESS_TOKEN")
    ZENODO_COMMUNITY: str = os.getenv("ZENODO_COMMUNITY", "")
    ZENODO_DEFAULT_ACCESS_RIGHT: str = os.getenv("ZENODO_DEFAULT_ACCESS_RIGHT", "open")
    ZENODO_DEFAULT_LICENSE: str = os.getenv("ZENODO_DEFAULT_LICENSE", "cc-by-4.0")
    ZENODO_MAX_FILE_SIZE_MB: int = int(os.getenv("ZENODO_MAX_FILE_SIZE_MB", "20"))

    # LDAP CUJAE (login alternativo — direct bind UPN, igual que referencia/ldap_client.py)
    LDAP_ENABLED: bool = os.getenv("LDAP_ENABLED", "true").lower() in ("1", "true", "yes")
    LDAP_HOST: str = os.getenv("LDAP_HOST", "10.8.1.125")
    LDAP_PORT: int = int(os.getenv("LDAP_PORT", "636"))
    LDAP_USE_SSL: bool = os.getenv("LDAP_USE_SSL", "true").lower() in ("1", "true", "yes")
    LDAP_BASE_DN: str = os.getenv("LDAP_BASE_DN", "dc=cujae,dc=edu,dc=cu")
    LDAP_USER_ATTR: str = os.getenv("LDAP_USER_ATTR") or os.getenv("LDAP_USER_ATTRIBUTE", "sAMAccountName")
    LDAP_USER_FILTER: str = os.getenv("LDAP_USER_FILTER", "")
    LDAP_TLS_VALIDATE: bool = (
        os.getenv("LDAP_TLS_VALIDATE") or os.getenv("LDAP_VALIDATE_CERT", "false")
    ).lower() in ("1", "true", "yes")
    LDAP_CA_CERT_PATH: str = os.getenv("LDAP_CA_CERT_PATH", "")
    LDAP_TIMEOUT_SECONDS: int = int(os.getenv("LDAP_TIMEOUT_SECONDS", "10"))

    # Compatibilidad con .env anterior (ya no usados por ldap_service direct bind)
    LDAP_BIND_DN: str = os.getenv("LDAP_BIND_DN", "")
    LDAP_BIND_PASSWORD: str = os.getenv("LDAP_BIND_PASSWORD", "")
    LDAP_USER_ATTRIBUTE: str = LDAP_USER_ATTR
    LDAP_USER_OBJECT_FILTER: str = os.getenv(
        "LDAP_USER_OBJECT_FILTER",
        "(&(|(objectclass=person)(objectclass=user))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
    )
    LDAP_WORKER_ATTRIBUTE: str = os.getenv("LDAP_WORKER_ATTRIBUTE", "employeeType")
    LDAP_WORKER_VALUE: str = os.getenv("LDAP_WORKER_VALUE", "trabajador")
    LDAP_VALIDATE_CERT: bool = LDAP_TLS_VALIDATE

settings = Settings()