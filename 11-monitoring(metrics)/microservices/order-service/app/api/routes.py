import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from redis import Redis
from sqlalchemy.orm import Session

from app.clients.user_service import UserServiceClient
from app.core.database import get_db
from app.models.schemas import OrderCreate, OrderResponse
from app.services.order_service import OrderService

router = APIRouter(prefix="/api/orders", tags=["orders"])
logger = logging.getLogger(__name__)


def get_order_service(request: Request) -> OrderService:
    return request.app.state.order_service


def get_user_service_client(request: Request) -> UserServiceClient:
    return request.app.state.user_service_client


@router.get("", response_model=dict[str, list[OrderResponse]])
def list_orders(
    db: Session = Depends(get_db),
    order_service: OrderService = Depends(get_order_service),
):
    return {"data": order_service.list_orders(db)}


@router.get("/{order_id}", response_model=dict[str, OrderResponse])
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    order_service: OrderService = Depends(get_order_service),
):
    return {"data": order_service.get_order(db, order_id)}


@router.post("", status_code=201, response_model=dict[str, OrderResponse])
def create_order(
    payload: OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    order_service: OrderService = Depends(get_order_service),
    user_service_client: UserServiceClient = Depends(get_user_service_client),
):
    user_service_client.get_user(payload.user_id, request.state.correlation_id)
    order = order_service.create_order(db, payload)
    logger.info("order created", extra={"order_id": str(order.id), "user_id": str(order.user_id)})
    return {"data": order}
