from __future__ import annotations

import contextvars
import hashlib
import json
import os
from typing import Any
from urllib import error, request

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.config import load_env_files

load_env_files()

_current_auth_claims: contextvars.ContextVar[dict[str, Any] | None] = contextvars.ContextVar(
    "avareno_auth_claims",
    default=None,
)


class AuthConfigError(Exception):
    pass


class AuthTokenError(Exception):
    pass


def current_auth_claims() -> dict[str, Any] | None:
    return _current_auth_claims.get()


def current_auth_user_id() -> str | None:
    claims = current_auth_claims()
    value = claims.get("sub") if claims else None
    return value if isinstance(value, str) and value else None


async def auth_middleware(request: Request, call_next):
    if (
        request.method == "OPTIONS"
        or not request.url.path.startswith("/api/")
        or request.url.path == "/api/health"
        or request.url.path.startswith("/api/webhooks/")
    ):
        return await call_next(request)

    required = os.environ.get("AVARENO_REQUIRE_AUTH") == "1"
    auth_header = request.headers.get("authorization", "")
    token = _bearer_token(auth_header)

    if not required and not token:
        return await call_next(request)

    if not token:
        return JSONResponse({"detail": "Authentication required"}, status_code=401)

    try:
        claims = await run_in_threadpool(verify_supabase_access_token, token)
    except AuthConfigError as exc:
        if required:
            return JSONResponse({"detail": str(exc)}, status_code=503)
        return await call_next(request)
    except AuthTokenError:
        if required:
            return JSONResponse({"detail": "Invalid or expired access token"}, status_code=401)
        return await call_next(request)

    subject = claims.get("sub")
    if isinstance(subject, str) and await run_in_threadpool(is_auth_subject_revoked, subject):
        return JSONResponse({"detail": "Invalid or expired access token"}, status_code=401)

    request.state.auth_claims = claims
    request.state.auth_user_id = claims.get("sub")
    reset_token = _current_auth_claims.set(claims)
    try:
        return await call_next(request)
    finally:
        _current_auth_claims.reset(reset_token)


def verify_supabase_access_token(token: str) -> dict[str, Any]:
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET") or os.environ.get("AVARENO_SUPABASE_JWT_SECRET")
    if jwt_secret:
        return _verify_supabase_access_token_with_secret(token, jwt_secret)

    supabase_url = _supabase_url()
    publishable_key = _supabase_publishable_key()
    if supabase_url and publishable_key:
        return _verify_supabase_access_token_with_auth_server(token, supabase_url, publishable_key)

    raise AuthConfigError("SUPABASE_JWT_SECRET or SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY is required when AVARENO_REQUIRE_AUTH=1")


def _verify_supabase_access_token_with_secret(token: str, jwt_secret: str) -> dict[str, Any]:
    if not jwt_secret:
        raise AuthConfigError("SUPABASE_JWT_SECRET is required when AVARENO_REQUIRE_AUTH=1")

    try:
        import jwt
    except ImportError as exc:
        raise AuthConfigError("PyJWT is required for Supabase JWT verification") from exc

    try:
        claims = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience=os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated"),
            options={"require": ["exp", "sub"]},
        )
    except Exception as exc:
        raise AuthTokenError("Invalid Supabase access token") from exc

    if not isinstance(claims.get("sub"), str):
        raise AuthTokenError("Missing auth subject")

    return claims


def _verify_supabase_access_token_with_auth_server(token: str, supabase_url: str, publishable_key: str) -> dict[str, Any]:
    user_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
    auth_request = request.Request(
        user_url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "apikey": publishable_key,
        },
        method="GET",
    )

    try:
        with request.urlopen(auth_request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise AuthTokenError("Invalid Supabase access token") from exc
        raise AuthConfigError(f"Supabase Auth verification failed with HTTP {exc.code}") from exc
    except error.URLError as exc:
        raise AuthConfigError("Supabase Auth verification is unreachable") from exc
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise AuthConfigError("Supabase Auth returned an unreadable response") from exc

    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise AuthTokenError("Missing auth subject")

    return {
        "sub": user_id,
        "aud": payload.get("aud") or "authenticated",
        "role": payload.get("role") or "authenticated",
        "email": payload.get("email"),
        "auth_created_at": payload.get("created_at"),
        "iss": f"{supabase_url.rstrip('/')}/auth/v1",
        "user_metadata": payload.get("user_metadata") if isinstance(payload.get("user_metadata"), dict) else {},
        "app_metadata": payload.get("app_metadata") if isinstance(payload.get("app_metadata"), dict) else {},
    }


def _supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").strip()


def _supabase_publishable_key() -> str:
    return (
        os.environ.get("SUPABASE_PUBLISHABLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY")
        or ""
    ).strip()


def _bearer_token(auth_header: str) -> str | None:
    prefix = "Bearer "
    if not auth_header.startswith(prefix):
        return None
    token = auth_header[len(prefix):].strip()
    return token or None


def auth_subject_hash(subject: str) -> str:
    return hashlib.sha256(f"avareno-auth-revocation:v1:{subject}".encode("utf-8")).hexdigest()


def is_auth_subject_revoked(subject: str) -> bool:
    # Local import avoids an auth <-> database import cycle during app boot.
    from app.db import db
    from app.utils import now_iso

    with db() as conn:
        row = conn.execute(
            'SELECT 1 FROM "AuthRevocation" WHERE subjectHash = ? AND expiresAt > ? LIMIT 1',
            (auth_subject_hash(subject), now_iso()),
        ).fetchone()
        return bool(row)
