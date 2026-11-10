from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
import logging


logger = logging.getLogger("uvicorn.error")


class UnhandledErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception("Unhandled error: %s", exc)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error"},
            )

