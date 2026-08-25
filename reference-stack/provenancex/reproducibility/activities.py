from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from temporalio import activity

from pipeline.revenue_risk import replay_revenue_risk_from_spec


@activity.defn
async def reproduce_recorded_pipeline(run_id: str, specification: dict[str, Any]) -> dict[str, Any]:
    """Reruns the captured local Pandas/Polars pipeline and verifies recorded input versions."""
    input_versions = specification.get("input_versions", {})
    if isinstance(input_versions, str):
        input_versions = json.loads(input_versions)
    result = replay_revenue_risk_from_spec({**specification, "input_versions": input_versions})
    return {"replay_of_run_id": run_id, "reproduced_at": datetime.now(UTC).isoformat(), **result}
