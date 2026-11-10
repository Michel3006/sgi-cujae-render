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
            with httpx.Client() as client:
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
                    message = payload.get("message")
                    errors = payload.get("errors")
                    if errors:
                        detail = {"message": message, "errors": errors}
                    elif message:
                        detail = message
                    else:
                        detail = payload
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

    def publish_deposition(self, deposition_id: str) -> dict:
        return self._request(
            "POST",
            f"/api/deposit/depositions/{deposition_id}/actions/publish",
            json_content=False,
        )

    def extract_publication_info(self, published_payload: dict) -> dict:
        metadata = published_payload.get("metadata", {})
        doi = metadata.get("doi")
        record_id = str(published_payload.get("record_id") or published_payload.get("id") or "")
        conceptrecid = str(published_payload.get("conceptrecid") or "")
        deposition_id = str(published_payload.get("id") or "")

        zenodo_url = None
        if doi:
            zenodo_url = f"https://doi.org/{doi}"
        elif record_id:
            host = "zenodo.org" if "sandbox" not in self.base_url else "sandbox.zenodo.org"
            zenodo_url = f"https://{host}/records/{record_id}"

        return {
            "zenodo_deposition_id": deposition_id,
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


def delete_local_copy(file_path: Optional[str]) -> None:
    """Elimina el PDF local tras publicar en Zenodo (el archivo ya está en Zenodo)."""
    if not file_path or not os.path.isfile(file_path):
        return

    os.remove(file_path)

    parent_dir = os.path.dirname(os.path.abspath(file_path))
    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    if parent_dir.startswith(upload_root):
        try:
            os.rmdir(parent_dir)
        except OSError:
            pass


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
