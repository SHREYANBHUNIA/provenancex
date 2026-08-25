from __future__ import annotations

import unittest

from pipeline.revenue_risk import run_revenue_risk_example
from reproducibility.activities import reproduce_recorded_pipeline


class MemoryCollector:
    def __init__(self) -> None:
        self.assets = []
        self.dependencies = []
        self.runs = []
        self.staleness_sources = []

    async def record_asset(self, asset):
        self.assets.append(asset)
        return asset

    async def record_dependency(self, dependency):
        self.dependencies.append(dependency)
        return dependency

    async def record_run(self, run):
        self.runs.append(run)
        return run

    async def propagate_staleness(self, source_asset_id):
        self.staleness_sources.append(source_asset_id)
        return 4


class RevenueRiskCaptureTest(unittest.IsolatedAsyncioTestCase):
    async def test_example_captures_chain_requests_staleness_and_replays_exact_inputs(self) -> None:
        collector = MemoryCollector()
        run = await run_revenue_risk_example(collector)
        replay = await reproduce_recorded_pipeline(run.run_id, run.model_dump())

        self.assertEqual(run.workflow_name, "reproduce_revenue_risk")
        self.assertEqual(len(collector.assets), 6)
        self.assertEqual(len(collector.dependencies), 5)
        self.assertEqual(collector.staleness_sources, ["dataset:orders_raw:2025-02-18"])
        self.assertEqual(collector.assets[0].name, "orders_raw")
        self.assertEqual(collector.assets[-1].name, "q1_retention_risk")
        self.assertEqual(replay["status"], "reproduced")
        self.assertEqual(replay["input_versions"], run.input_versions)
        self.assertEqual(replay["prediction_count"], 3)
