import logging
from uuid import UUID

import httpx
from fastapi import HTTPException
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class UserServiceClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.user_service_url,
            timeout=settings.request_timeout_seconds,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.2, min=0.2, max=2),
        retry=retry_if_exception_type(httpx.HTTPError),
        reraise=True,
    )
    def get_user(self, user_id: UUID, correlation_id: str) -> dict:
        response = self._client.get(
            f"/api/users/{user_id}",
            headers={"x-correlation-id": correlation_id},
        )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="User not found")

        response.raise_for_status()
        payload = response.json()
        logger.info("validated user via user-service", extra={"user_id": str(user_id)})
        return payload["data"]

    def close(self) -> None:
        self._client.close()
