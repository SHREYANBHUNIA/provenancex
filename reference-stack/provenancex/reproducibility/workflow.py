from __future__ import annotations

from datetime import timedelta
from typing import Any

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from reproducibility.activities import reproduce_recorded_pipeline


@workflow.defn
class ReproduceRecordedPipeline:
    """Durably re-executes a run from captured specifications and input versions."""

    @workflow.run
    async def run(self, run_id: str, specification: dict[str, Any]) -> dict[str, Any]:
        return await workflow.execute_activity(
            reproduce_recorded_pipeline,
            args=[run_id, specification],
            start_to_close_timeout=timedelta(minutes=10),
        )
