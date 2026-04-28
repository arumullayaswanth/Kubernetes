import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from redis import Redis
from sqlalchemy import text

from app.api.routes import router
from app.clients.user_service import UserServiceClient
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import configure_logging, correlation_id_ctx
from app.core.metrics import observe_request, render_metrics
from app.services.order_service import OrderService

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = redis_client
    app.state.order_service = OrderService(redis_client)
    app.state.user_service_client = UserServiceClient()
    logger.info("order-service started")
    yield
    app.state.user_service_client.close()
    redis_client.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id", str(uuid4()))
    token = correlation_id_ctx.set(correlation_id)
    request.state.correlation_id = correlation_id

    started = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request failed")
        response = JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "Internal Server Error",
                    "correlationId": correlation_id,
                }
            },
        )

    route = request.scope.get("route")
    route_pattern = getattr(route, "path", request.url.path)
    observe_request(request.method, route_pattern, response.status_code, time.perf_counter() - started)
    correlation_id_ctx.reset(token)

    response.headers["x-correlation-id"] = correlation_id
    return response


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready(request: Request):
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    request.app.state.redis.ping()
    return {"status": "ready"}


@app.get("/metrics", include_in_schema=False)
def metrics():
    payload, content_type = render_metrics()
    return Response(content=payload, media_type=content_type)


app.include_router(router)
