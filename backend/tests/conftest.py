"""Test environment: isolated SQLite DB + upload dir per test session.

Env must be set before app.main is imported, because config values are
read at import time. All tests run in dev auth mode (open, single user);
production auth enforcement is covered by test_auth_boot.py via real
subprocess boots.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

_tmp = tempfile.mkdtemp(prefix="avareno-test-")
os.environ["AVARENO_DB_PATH"] = str(Path(_tmp) / "test.db")
os.environ["AVARENO_UPLOAD_ROOT"] = str(Path(_tmp) / "uploads")
os.environ["AVARENO_SIGNED_URL_SECRET"] = "test-signing-secret"
os.environ["AVARENO_CONNECTOR_SECRET_KEY"] = "test-connector-key"
os.environ["AVARENO_MAX_UPLOAD_BYTES"] = str(64 * 1024)  # 64 KB cap for upload tests
os.environ.pop("AVARENO_ENV", None)
os.environ.pop("AVARENO_REQUIRE_AUTH", None)
os.environ.pop("AVARENO_ENABLE_STATIC_UPLOADS", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
