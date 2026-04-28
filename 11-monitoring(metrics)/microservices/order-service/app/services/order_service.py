import json
import logging
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order
from app.models.schemas import OrderCreate

logger = logging.getLogger(__name__)


class OrderService:
    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    def _cache_key(self, order_id: UUID) -> str:
        return f"order:{order_id}"

    def list_orders(self, db: Session) -> list[Order]:
        orders = db.scalars(select(Order).order_by(Order.created_at.desc())).all()
        return list(orders)

    def get_order(self, db: Session, order_id: UUID):
        cached = self.redis.get(self._cache_key(order_id))
        if cached:
            logger.info("cache hit for order", extra={"order_id": str(order_id)})
            return json.loads(cached)

        order = db.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        self.redis.setex(
            self._cache_key(order_id),
            settings.cache_ttl_seconds,
            json.dumps(self._serialize_order(order)),
        )
        return order

    def create_order(self, db: Session, payload: OrderCreate) -> Order:
        order = Order(
            user_id=payload.user_id,
            item=payload.item,
            quantity=payload.quantity,
            amount=Decimal(str(payload.amount)),
            status="created",
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        self.redis.setex(
            self._cache_key(order.id),
            settings.cache_ttl_seconds,
            json.dumps(self._serialize_order(order)),
        )
        return order

    @staticmethod
    def _serialize_order(order: Order) -> dict:
        return {
            "id": str(order.id),
            "user_id": str(order.user_id),
            "item": order.item,
            "quantity": order.quantity,
            "amount": float(order.amount),
            "status": order.status,
            "created_at": order.created_at.isoformat(),
        }
