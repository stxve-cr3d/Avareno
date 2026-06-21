from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import DB_PATH, init_database  # noqa: E402


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    init_database()
    print(f"Initialized SQLite database at {DB_PATH}")


if __name__ == "__main__":
    main()
