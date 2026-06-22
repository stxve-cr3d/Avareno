from __future__ import annotations

from pydantic import BaseModel, Field


class ReceiptExtractRequest(BaseModel):
    documentId: str | None = None
    fileName: str | None = None
    text: str | None = None


class ItemCreate(BaseModel):
    name: str
    category: str = "Other"
    householdId: str | None = None
    spaceId: str | None = None
    itemType: str = "THING"
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    purchaseDate: str | None = None
    merchant: str | None = None
    price: float | None = None
    currency: str = "EUR"
    imageUrl: str | None = None
    warrantyUntil: str | None = None
    location: str | None = None
    notes: str | None = None
    reorderUrl: str | None = None
    affiliateUrl: str | None = None
    affiliateProvider: str | None = None
    visibility: str = "HOUSEHOLD"
    documentId: str | None = None


class ItemPatch(BaseModel):
    name: str | None = None
    category: str | None = None
    householdId: str | None = None
    spaceId: str | None = None
    itemType: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    purchaseDate: str | None = None
    merchant: str | None = None
    price: float | None = None
    currency: str | None = None
    imageUrl: str | None = None
    warrantyUntil: str | None = None
    location: str | None = None
    notes: str | None = None
    reorderUrl: str | None = None
    affiliateUrl: str | None = None
    affiliateProvider: str | None = None
    visibility: str | None = None
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


class NotificationSnoozeRequest(BaseModel):
    remindAt: str


class PlanActionCreate(BaseModel):
    itemId: str | None = None
    title: str
    note: str | None = None
    dueDate: str | None = None
    remindAt: str | None = None
    priority: str = "MEDIUM"


class MobileDeviceRegister(BaseModel):
    platform: str
    pushToken: str
    deviceName: str | None = None


class SpaceCreate(BaseModel):
    name: str
    type: str = "ROOM"
    parentId: str | None = None


class HouseholdInviteCreate(BaseModel):
    email: str
    name: str | None = None
    role: str = "VIEWER"


class PlanTierUpdate(BaseModel):
    tier: str


class SmartHomeConnectRequest(BaseModel):
    provider: str = "HOME_ASSISTANT"


class SmartHomeCommandRequest(BaseModel):
    command: str
    value: str | int | float | bool | None = None


class SmartHomeLinkItemRequest(BaseModel):
    itemId: str | None = None


class LocalDiscoveryImportRequest(BaseModel):
    candidateId: str | None = None
    host: str | None = None


class LocalDiscoveryProbeRequest(BaseModel):
    host: str = Field(min_length=1)


class BambuLabSetupRequest(BaseModel):
    host: str = Field(min_length=1)
    model: str = "Bambu Lab P1S"
    serial: str | None = None
    accessCode: str | None = None
    roomName: str = "Werkstatt"
    itemId: str | None = None
    createItem: bool = True


class BambuHostDiagnosticRequest(BaseModel):
    host: str = Field(min_length=1)


class BambuPrintEventRequest(BaseModel):
    deviceId: str | None = None
    eventType: str = "FINISHED"
    jobName: str | None = None
    message: str | None = None
    filamentRemaining: int | None = None
    nozzleTemp: int | None = None
    bedTemp: int | None = None
    chamberTemp: int | None = None


class ItemActivityCreate(BaseModel):
    type: str = "COMMENT"
    message: str


class AffiliateClickCreate(BaseModel):
    itemId: str | None = None
    partnerSlug: str | None = None
    targetUrl: str
    source: str = "ITEM_REORDER"


class MessageCapture(BaseModel):
    text: str = Field(min_length=1)
    contactName: str | None = None


class UniversalCaptureRequest(BaseModel):
    inputType: str = "TEXT"
    text: str = Field(min_length=1)
    spaceId: str | None = None
    itemType: str | None = None


class AssistantAskRequest(BaseModel):
    question: str = Field(min_length=1)
