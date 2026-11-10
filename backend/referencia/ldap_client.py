"""
LDAP client for CUJAE Active Directory integration.

Direct bind flow: bind as the user with their own credentials (UPN format),
then search for the user's attributes on the same connection.
"""

import asyncio
import logging
import ssl
import uuid
from dataclasses import dataclass
from typing import Optional

import ldap3
from ldap3.core.exceptions import (
    LDAPBindError,
    LDAPException,
    LDAPSocketOpenError,
    LDAPSocketReceiveError,
    LDAPSocketSendError,
    LDAPCommunicationError,
)

from src.core.config import settings
from src.core.exceptions import InvalidCredentialsException

logger = logging.getLogger(__name__)


@dataclass
class LdapUserInfo:
    """Información de un usuario autenticado contra el AD de CUJAE."""

    guid: uuid.UUID
    sam_account_name: str
    ci: str                     # CI cubano de 11 dígitos — viene del atributo cn
    display_name: str
    mail: Optional[str]
    cujae_person_type: str      # "Worker" o "Student"
    cujae_person_external: bool  # True si cUJAEPersonExternal == "TRUE"


class LdapConnectionError(Exception):
    """Se lanza cuando el servidor LDAP no es alcanzable o hay timeout de red.

    Distingue problemas de infraestructura (AD caído, timeout) de
    credenciales inválidas (LDAPBindError).
    """


def _base_dn_to_upn_domain(base_dn: str) -> str:
    """Convierte un base DN tipo `dc=cujae,dc=edu,dc=cu` en dominio UPN `cujae.edu.cu`."""
    parts = []
    for component in base_dn.split(","):
        component = component.strip()
        if component.lower().startswith("dc="):
            parts.append(component[3:])
    return ".".join(parts)


class LdapAuthenticator:
    """Autenticador contra el Active Directory de CUJAE vía ldap3.

    Flujo (direct bind):
        1. Bind con las credenciales del propio usuario en formato UPN
           (`username@cujae.edu.cu`).
        2. Search sobre la misma conexión por sAMAccountName para leer atributos.

    El método público `authenticate` es async; la lógica síncrona de ldap3
    se ejecuta en un executor para no bloquear el event loop.
    """

    def __init__(self) -> None:
        self._host = settings.LDAP_HOST
        self._port = settings.LDAP_PORT
        self._use_ssl = settings.LDAP_USE_SSL
        self._base_dn = settings.LDAP_BASE_DN
        self._user_attr = settings.LDAP_USER_ATTR
        self._user_filter = settings.LDAP_USER_FILTER
        self._tls_validate = settings.LDAP_TLS_VALIDATE
        self._ca_cert_path = settings.LDAP_CA_CERT_PATH
        self._timeout = settings.LDAP_TIMEOUT_SECONDS
        self._upn_domain = _base_dn_to_upn_domain(self._base_dn)

    # ------------------------------------------------------------------
    # Public async interface
    # ------------------------------------------------------------------

    async def authenticate(self, username: str, password: str) -> LdapUserInfo:
        """Autenticar un usuario contra el AD.

        Args:
            username: sAMAccountName del usuario (login de Windows/AD). Si trae
                `@dominio` se usa tal cual; si no, se concatena el dominio UPN
                derivado del base DN.
            password: Contraseña del usuario en texto plano.

        Returns:
            LdapUserInfo con los atributos del usuario.

        Raises:
            RuntimeError: Si LDAP_ENABLED es False.
            InvalidCredentialsException: Usuario no encontrado o contraseña incorrecta.
            LdapConnectionError: El servidor AD no es alcanzable o hay timeout.
        """
        if not settings.LDAP_ENABLED:
            raise RuntimeError("LDAP is disabled")

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._sync_authenticate, username, password
        )

    # ------------------------------------------------------------------
    # Private sync implementation
    # ------------------------------------------------------------------

    def _build_tls(self) -> Optional[ldap3.Tls]:
        if not self._use_ssl:
            return None

        if not self._tls_validate:
            return ldap3.Tls(validate=ssl.CERT_NONE)

        if self._ca_cert_path:
            return ldap3.Tls(
                validate=ssl.CERT_REQUIRED,
                ca_certs_file=self._ca_cert_path,
            )

        return ldap3.Tls(validate=ssl.CERT_REQUIRED)

    def _make_server(self) -> ldap3.Server:
        tls = self._build_tls()
        return ldap3.Server(
            host=self._host,
            port=self._port,
            use_ssl=self._use_ssl,
            tls=tls,
            connect_timeout=self._timeout,
            get_info=ldap3.NONE,
        )

    def _format_upn(self, username: str) -> str:
        """Devuelve el username en formato UPN. Si ya trae `@`, no lo modifica."""
        if "@" in username:
            return username
        return f"{username}@{self._upn_domain}"

    def _extract_sam(self, username: str) -> str:
        """Extrae el sAMAccountName: parte previa al `@` si viene en UPN."""
        return username.split("@", 1)[0]

    def _bind_and_fetch(
        self,
        server: ldap3.Server,
        username: str,
        password: str,
    ) -> LdapUserInfo:
        """Bind directo con las credenciales del usuario y lectura de atributos.

        Raises:
            InvalidCredentialsException: Credenciales inválidas o user no existe.
            LdapConnectionError: Problemas de red o respuestas inesperadas del AD.
        """
        attrs = [
            "objectGUID",
            "sAMAccountName",
            "cn",
            "displayName",
            "mail",
            "cUJAEPersonType",
            "cUJAEPersonExternal",
        ]

        upn = self._format_upn(username)
        sam = self._extract_sam(username)

        try:
            conn = ldap3.Connection(
                server,
                user=upn,
                password=password,
                authentication=ldap3.SIMPLE,
                auto_bind=ldap3.AUTO_BIND_TLS_BEFORE_BIND if self._use_ssl else ldap3.AUTO_BIND_NO_TLS,
                receive_timeout=self._timeout,
                auto_referrals=False,
            )
        except LDAPBindError as exc:
            desc = str(exc).lower()
            if any(kw in desc for kw in ("invalid credentials", "52e", "unwilling", "logon failure")):
                logger.info("LDAP: invalid credentials for '%s'", upn)
                raise InvalidCredentialsException() from exc
            logger.error("LDAP bind error for '%s': %s", upn, exc)
            raise LdapConnectionError(f"Error en bind de usuario: {exc}") from exc
        except (LDAPSocketOpenError, LDAPSocketReceiveError, LDAPSocketSendError, LDAPCommunicationError) as exc:
            logger.error("LDAP connection error during user bind: %s", exc)
            raise LdapConnectionError(f"No se pudo conectar al servidor LDAP: {exc}") from exc
        except LDAPException as exc:
            logger.error("Unexpected LDAP error during user bind: %s", exc)
            raise LdapConnectionError(f"Error LDAP inesperado: {exc}") from exc

        search_filter = (
            f"({self._user_attr}={ldap3.utils.conv.escape_filter_chars(sam)})"
        )
        logger.info("LDAP search base=%s filter=%s", self._base_dn, search_filter)

        try:
            conn.search(
                search_base=self._base_dn,
                search_filter=search_filter,
                search_scope=ldap3.SUBTREE,
                attributes=attrs,
            )
        except (LDAPSocketReceiveError, LDAPSocketSendError, LDAPCommunicationError) as exc:
            logger.error("LDAP attribute read failed: %s", exc)
            raise LdapConnectionError(f"Error de red al leer atributos: {exc}") from exc

        logger.info(
            "LDAP search result code=%s desc=%s entries=%d response_items=%d",
            conn.result.get("result"),
            conn.result.get("description"),
            len(conn.entries),
            len(conn.response) if conn.response else 0,
        )
        if conn.response:
            for item in conn.response[:3]:
                logger.info("LDAP response item type=%s dn=%s", item.get("type"), item.get("dn"))

        try:
            conn.unbind()
        except Exception:  # noqa: BLE001
            pass

        if not conn.entries:
            logger.error("LDAP: authenticated user '%s' returned no entries", upn)
            raise LdapConnectionError(
                "Usuario autenticado pero no se pudo leer su entrada en el AD."
            )

        entry = conn.entries[0]
        return self._parse_entry(entry)

    @staticmethod
    def _parse_entry(entry: ldap3.abstract.entry.Entry) -> LdapUserInfo:
        """Mapear una entrada ldap3 a LdapUserInfo.

        objectGUID en AD está codificado como bytes en orden little-endian
        mixto (mixed-endian). ldap3 puede entregarlo como bytes; se convierte
        con `uuid.UUID(bytes_le=...)` que respeta ese encoding.
        """
        raw_guid = entry.objectGUID.value
        if isinstance(raw_guid, bytes):
            guid = uuid.UUID(bytes_le=raw_guid)
        elif isinstance(raw_guid, uuid.UUID):
            guid = raw_guid
        else:
            guid = uuid.UUID(str(raw_guid))

        sam = str(entry.sAMAccountName.value) if entry.sAMAccountName else ""
        ci = str(entry.cn.value) if entry.cn else ""
        display_name = str(entry.displayName.value) if entry.displayName else ""

        mail_val = entry.mail.value if entry.mail else None
        mail = str(mail_val) if mail_val else None

        person_type_val = entry.cUJAEPersonType.value if entry.cUJAEPersonType else None
        cujae_person_type = str(person_type_val) if person_type_val in ("Worker", "Student") else "Worker"

        external_val = entry.cUJAEPersonExternal.value if entry.cUJAEPersonExternal else None
        cujae_person_external = str(external_val).upper() == "TRUE" if external_val else False

        return LdapUserInfo(
            guid=guid,
            sam_account_name=sam,
            ci=ci,
            display_name=display_name,
            mail=mail,
            cujae_person_type=cujae_person_type,
            cujae_person_external=cujae_person_external,
        )

    def _sync_authenticate(self, username: str, password: str) -> LdapUserInfo:
        """Flujo síncrono completo: bind directo + read de atributos."""
        server = self._make_server()
        return self._bind_and_fetch(server, username, password)
