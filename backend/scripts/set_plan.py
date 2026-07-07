"""Dev helper: switch the local test account between subscription plans.

Usage (from backend/):
    python scripts/set_plan.py pro
    python scripts/set_plan.py free

Writes PlanSubscription.planKey directly - local testing only, no Stripe involved.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import db  # noqa: E402
from app.services.billing import plan_by_key  # noqa: E402

VALID = ("free", "personal", "pro", "family")


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1].lower() not in VALID:
        print(f"Usage: python scripts/set_plan.py <{'|'.join(VALID)}>")
        return 1
    plan_key = sys.argv[1].lower()
    plan = plan_by_key(plan_key)
    with db() as conn:
        updated = conn.execute(
            'UPDATE "PlanSubscription" SET planKey = ?, tier = ?, status = ?, itemLimit = ?, storageLimitMb = ?',
            (plan.key, plan.key.upper(), "ACTIVE", plan.item_limit, plan.storage_limit_mb),
        ).rowcount
    print(f"{updated} subscription(s) -> {plan.name}: {plan.item_limit} Objekte, {plan.storage_limit_mb} MB, "
          f"{plan.reminder_limit} Erinnerungen, {plan.ai_actions_per_month} AI/Monat, {plan.vault_limit} Vault(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
