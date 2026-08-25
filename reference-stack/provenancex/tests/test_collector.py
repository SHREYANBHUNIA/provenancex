from __future__ import annotations

import unittest

from collector.contracts import AssetKind, AssetStatus, ProvenanceAsset
from collector.service import ProvenanceCollector


class StoreSpy:
    def __init__(self) -> None:
        self.recorded = []
        self.invalidated = []

    async def upsert_asset(self, asset):
        self.recorded.append(asset.id)

    async def mark_downstream_stale(self, asset_id):
        self.invalidated.append(asset_id)
        return 4


class CollectorInvalidationTest(unittest.IsolatedAsyncioTestCase):
    async def test_changed_source_propagates_staleness_through_store(self) -> None:
        store = StoreSpy()
        collector = ProvenanceCollector(store)
        await collector.record_asset(ProvenanceAsset(id="dataset:orders:v2", kind=AssetKind.DATASET, name="orders", version="v2", status=AssetStatus.CHANGED))
        self.assertEqual(store.recorded, ["dataset:orders:v2"])
        self.assertEqual(store.invalidated, ["dataset:orders:v2"])
