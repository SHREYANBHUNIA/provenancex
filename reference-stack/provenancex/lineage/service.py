from __future__ import annotations

from graph.neo4j_store import Neo4jLineageStore


class LineageService:
    """Provides graph traversal and explicit stale-cause identification."""

    def __init__(self, store: Neo4jLineageStore) -> None:
        self.store = store

    async def trace(self, asset_id: str, direction: str = "upstream") -> dict:
        return await self.store.trace(asset_id, direction)

    async def stale_causes(self, asset_id: str) -> list[dict]:
        graph = await self.store.trace(asset_id, "upstream")
        return [node for node in graph["nodes"] if node.get("status") in {"changed", "stale"}]
