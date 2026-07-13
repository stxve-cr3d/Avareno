"""Production auth guarantees, verified against real process boots.

These spawn actual uvicorn processes because the guards run at import
time and auth middleware behavior differs per environment. Deterministic:
fixed localhost ports, bounded polling, no external services.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _base_env(tmp: str) -> dict:
    env = {k: v for k, v in os.environ.items() if not k.startswith("AVARENO_")}
    env.update(
        {
            "AVARENO_DB_PATH": str(Path(tmp) / "boot.db"),
            "AVARENO_UPLOAD_ROOT": str(Path(tmp) / "uploads"),
            "AVARENO_SIGNED_URL_SECRET": "boot-test-secret",
        }
    )
    return env


def _wait_http(url: str, timeout_seconds: float = 15.0) -> int:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                return response.status
        except urllib.error.HTTPError as error:
            return error.code
        except Exception as error:  # noqa: BLE001 - retry until deadline
            last_error = error
            time.sleep(0.25)
    raise AssertionError(f"server never answered at {url}: {last_error}")


def test_require_auth_rejects_anonymous_requests():
    port = _free_port()
    with tempfile.TemporaryDirectory() as tmp:
        env = _base_env(tmp)
        env["AVARENO_REQUIRE_AUTH"] = "1"
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=BACKEND_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            assert _wait_http(f"http://127.0.0.1:{port}/api/health") == 200
            assert _wait_http(f"http://127.0.0.1:{port}/api/items") == 401
            assert _wait_http(f"http://127.0.0.1:{port}/api/privacy/summary") == 401
        finally:
            process.terminate()
            process.wait(timeout=10)


def test_production_refuses_to_boot_without_auth():
    port = _free_port()
    with tempfile.TemporaryDirectory() as tmp:
        env = _base_env(tmp)
        env["AVARENO_ENV"] = "production"  # REQUIRE_AUTH deliberately unset
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=BACKEND_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        try:
            _, stderr = process.communicate(timeout=20)
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
        assert process.returncode not in (0, None)
        assert b"AVARENO_REQUIRE_AUTH=1 is required in production" in stderr


def test_production_refuses_static_uploads():
    port = _free_port()
    with tempfile.TemporaryDirectory() as tmp:
        env = _base_env(tmp)
        env["AVARENO_ENV"] = "production"
        env["AVARENO_REQUIRE_AUTH"] = "1"
        env["AVARENO_ENABLE_STATIC_UPLOADS"] = "1"
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=BACKEND_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        try:
            _, stderr = process.communicate(timeout=20)
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
        assert process.returncode not in (0, None)
        assert b"AVARENO_ENABLE_STATIC_UPLOADS" in stderr
