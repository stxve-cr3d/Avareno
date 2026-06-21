from __future__ import annotations

from pydantic import BaseModel, Field


class ReceiptExtractRequest(BaseModel):
    documentId: str | None = None
    fileName: str | None = None
    text: str | None = None


class ItemCreate(BaseModel):
    name: str
    category: str = "Other"
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    purchaseDate: str | None = None
    merchant: str | None = None
    price: float | None = None
    currency: str = "EUR"
    warrantyUntil: str | None = None
    location: str | None = None
    documentId: str | None = None


class ItemPatch(BaseModel):
    name: str | None = None
    category: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    purchaseDate: str | None = None
    merchant: str | None = None
    price: float | None = None
    currency: str | None = None
    warrantyUntil: str | None = None
    location: str | None = None
    status: str | None = None


class LoopCreate(BaseModel):
    itemId: str | None = None
    title: str
    description: str | None = None
    sourceType: str = "MANUAL"
    priority: str = "MEDIUM"
    dueDate: str | None = None
    reminderAt: str | None = None
    xpReward: int = 25


class LoopPatch(BaseModel):
    itemId: str | None = None
    title: str | None = None
    description: str | None = None
    sourceType: str | None = None
    priority: str | None = None
    status: str | None = None
    dueDate: str | None = None
    reminderAt: str | None = None
    xpReward: int | None = None


class SnoozeRequest(BaseModel):
    reminderAt: str


class MessageCapture(BaseModel):
    text: str = Field(min_length=1)
    contactName: str | None = None
