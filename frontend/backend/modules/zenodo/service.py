import os
from typing import BinaryIO, Optional

import httpx
from fastapi import HTTPException, status

from core.config import settings


class ZenodoService:
    def __init__(self):
        self.base_url = settings.ZENODO_API_URL.rstrip("/")
        self.token = settings.ZENODO_ACCESS_TOKEN
        self.community = settings.ZENODO_COMMUNITY

    def _headers(self, json_content: bool = False) -> dict:
        if not self.token:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ZENODO_ACCESS_TOKEN no está configurado en el servidor",
            )
        headers = {"Authorization": f"Bearer {self.token}"}
        if json_content:
            headers["Content-Type"] = "application/json"
        return headers

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.base_url}{path}"
        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.request(method, url, headers=self._headers(json_content=kwargs.pop("json_content", False)), **kwargs)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"No se pudo conectar con Zenodo: {exc}",
            ) from exc

        if response.status_code >= 400:
            detail = response.text
            try:
                payload = response.json()
                if isinstance(payload, dict):
                    detail = payload.get("message") or payload.get("errors") or payload
            except ValueError:
                pass
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error de Zenodo ({response.status_code}): {detail}",
            )

        if not response.content:
            return {}
        return response.json()

    def create_deposition(self) -> dict:
        payload = {}
        if self.community:
            payload = {"metadata": {"communities": [{"identifier": self.community}]}}
        return self._request(
            "POST",
            "/api/deposit/depositions",
            json=payload,
            json_content=True,
        )

    def update_deposition_metadata(self, deposition_id: str, metadata_payload: dict) -> dict:
        metadata = metadata_payload.get("metadata", {})
        metadata["access_right"] = settings.ZENODO_DEFAULT_ACCESS_RIGHT
        metadata["license"] = settings.ZENODO_DEFAULT_LICENSE
        if self.community and "communities" not in metadata:
            metadata["communities"] = [{"identifier": self.community}]

        return self._request(
            "PUT",
            f"/api/deposit/depositions/{deposition_id}",
            json={"metadata": metadata},
            json_content=True,
        )

    def upload_file(self, bucket_url: str, filename: str, file_obj: BinaryIO) -> dict:
        url = f"{bucket_url.rstrip('/')}/{filename}"
        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.put(
                    url,
                    content=file_obj.read(),
                    headers=self._headers(),
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error subiendo archivo a Zenodo: {exc}",
            ) from exc

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error subiendo archivo a Zenodo ({response.status_code}): {response.text}",
            )

        if not response.content:
            return {}
        return response.json()

    def public_web_host(self) -> str:
        """Dominio web público (no confundir con la URL de la API)."""
        return "sandbox.zenodo.org" if "sandbox" in self.base_url else "zenodo.org"

    def publish_deposition(self, deposition_id: str) -> dict:
        published = self._request(
            "POST",
            f"/api/deposit/depositions/{deposition_id}/actions/publish",
            json_content=False,
        )
        # Tras publicar, a veces conviene refrescar el depósito para obtener record_url / record_id.
        if not published.get("record_url"):
            try:
                refreshed = self._request(
                    "GET",
                    f"/api/deposit/depositions/{deposition_id}",
                )
                if refreshed:
                    published = refreshed
            except HTTPException:
                pass
        return published

    def extract_publication_info(self, published_payload: dict) -> dict:
        """
        Construye la URL pública del registro en Zenodo.

        Importante (API Zenodo):
        - `id` = ID del depósito (borrador/subida), NO usar en /records/{id}.
        - `record_id` = ID del registro publicado (sí válido en /records/{record_id}).
        - `record_url` / `doi_url` = enlaces oficiales tras publicar (preferidos).
        Ver: https://developers.zenodo.org/ — campos record_id, record_url, doi_url.
        """
        metadata = published_payload.get("metadata") or {}
        links = published_payload.get("links") or {}

        deposition_id = str(published_payload.get("id") or "")
        record_id_raw = published_payload.get("record_id")
        record_id = str(record_id_raw) if record_id_raw is not None else ""
        conceptrecid = str(published_payload.get("conceptrecid") or "")

        doi = published_payload.get("doi") or metadata.get("doi")
        host = self.public_web_host()

        zenodo_url: Optional[str] = None

        record_url = published_payload.get("record_url")
        if record_url:
            zenodo_url = str(record_url).strip()
        elif published_payload.get("doi_url"):
            zenodo_url = str(published_payload["doi_url"]).strip()
        elif doi:
            doi_str = str(doi).strip()
            zenodo_url = doi_str if doi_str.startswith("http") else f"https://doi.org/{doi_str}"
        elif links.get("record_html"):
            zenodo_url = str(links["record_html"]).strip()
        elif record_id:
            zenodo_url = f"https://{host}/records/{record_id}"
        elif conceptrecid:
            # Página del concepto (todas las versiones); mejor que un ID de depósito erróneo.
            zenodo_url = f"https://{host}/records/{conceptrecid}"

        return {
            "zenodo_deposition_id": deposition_id or None,
            "zenodo_record_id": record_id or None,
            "zenodo_conceptrecid": conceptrecid or None,
            "doi": doi,
            "zenodo_url": zenodo_url,
        }


def save_local_copy(entity_type: str, entity_id: int, filename: str, content: bytes) -> str:
    target_dir = os.path.join(settings.UPLOAD_DIR, entity_type, str(entity_id))
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, filename)
    with open(file_path, "wb") as output:
        output.write(content)
    return file_path


def validate_pdf_file(filename: str, content: bytes) -> None:
    max_bytes = settings.ZENODO_MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo supera el límite de {settings.ZENODO_MAX_FILE_SIZE_MB} MB",
        )
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se permiten archivos PDF")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo no parece ser un PDF válido")
