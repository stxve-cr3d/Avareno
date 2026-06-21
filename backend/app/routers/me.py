from __future__ import annotations

from fastapi import APIRouter

from app.db import db
from app.dependencies import get_default_user

router = APIRouter()


@router.get("")
def me() -> dict:
    with db() as conn:
        return get_default_user(conn)
