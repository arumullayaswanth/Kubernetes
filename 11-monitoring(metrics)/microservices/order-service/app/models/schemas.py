from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    user_id: UUID
    item: str = Field(min_length=2, max_length=255)
    quantity: int = Field(gt=0, le=1000)
    amount: float = Field(gt=0)


class OrderResponse(BaseModel):
    id: UUID
    user_id: UUID
    item: str
    quantity: int
    amount: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
