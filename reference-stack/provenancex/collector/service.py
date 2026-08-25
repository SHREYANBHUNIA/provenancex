from __future__ import annotations

from collector.contracts import AssetStatus, Dependency, PipelineRunSpec, ProvenanceAsset
from graph.neo4j_store import Neo4jLineageStore


class ProvenanceCollector:
    """Single application-facing entry point for durable provenance capture and invalidation."""

    def __init__(self, store: Neo4jLineageStore) -> None:
        self.store = store

    async def record_asset(self, asset: ProvenanceAsset) -> ProvenanceAsset:
        await self.store.upsert_asset(asset)
        if asset.status == AssetStatus.CHANGED:
            await self.propagate_staleness(asset.id)
        return asset

    async def record_dependency(self, dependency: Dependency) -> Dependency:
        await self.store.upsert_dependency(dependency)
        return dependency

    async def record_run(self, run: PipelineRunSpec) -> PipelineRunSpec:
        await self.store.upsert_run_spec(run)
        return run

    async def propagate_staleness(self, source_asset_id: str) -> int:
        """Marks all existing downstream graph dependents stale after a source-version change."""
        return await self.store.mark_downstream_stale(source_asset_id)
