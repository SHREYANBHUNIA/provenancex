from __future__ import annotations

import json
from typing import Any

from neo4j import AsyncDriver, AsyncGraphDatabase

from collector.contracts import Dependency, PipelineRunSpec, ProvenanceAsset


class Neo4jLineageStore:
    """Persists immutable asset versions and directed lineage edges in Neo4j."""

    def __init__(self, uri: str, username: str, password: str) -> None:
        self.driver: AsyncDriver = AsyncGraphDatabase.driver(uri, auth=(username, password))

    async def close(self) -> None:
        await self.driver.close()

    async def verify(self) -> None:
        await self.driver.verify_connectivity()

    async def upsert_asset(self, asset: ProvenanceAsset) -> None:
        properties = asset.model_dump(mode="json")
        properties["metadata"] = json.dumps(properties["metadata"], sort_keys=True)
        query = """
        MERGE (asset:ProvenanceAsset {id: $id})
        SET asset += $properties, asset.kind = $kind, asset.updated_at = datetime()
        """
        async with self.driver.session() as session:
            await session.run(query, id=asset.id, kind=asset.kind.value, properties=properties)

    async def upsert_dependency(self, dependency: Dependency) -> None:
        query = """
        MATCH (source:ProvenanceAsset {id: $source_asset_id})
        MATCH (target:ProvenanceAsset {id: $target_asset_id})
        MERGE (source)-[edge:LINEAGE {id: $id}]->(target)
        SET edge.relation = $relation, edge.metadata = $metadata, edge.recorded_at = datetime()
        """
        async with self.driver.session() as session:
            await session.run(query, id=dependency.id, source_asset_id=dependency.source_asset_id, target_asset_id=dependency.target_asset_id, relation=dependency.relation, metadata=json.dumps(dependency.metadata, sort_keys=True))

    async def mark_downstream_stale(self, source_asset_id: str) -> int:
        query = """
        MATCH (source:ProvenanceAsset {id: $source_asset_id})-[:LINEAGE*1..]->(downstream:ProvenanceAsset)
        WHERE downstream.status <> 'changed'
        SET downstream.status = 'stale', downstream.stale_cause = $source_asset_id, downstream.updated_at = datetime()
        RETURN count(DISTINCT downstream) AS invalidated
        """
        async with self.driver.session() as session:
            result = await session.run(query, source_asset_id=source_asset_id)
            record = await result.single()
        return int(record["invalidated"]) if record else 0

    async def upsert_run_spec(self, run: PipelineRunSpec) -> None:
        query = """
        MERGE (run:PipelineRun {id: $run_id})
        SET run.workflow_name = $workflow_name, run.pipeline_version = $pipeline_version,
            run.input_versions = $input_versions, run.output_asset_id = $output_asset_id,
            run.environment = $environment, run.parameters = $parameters, run.recorded_at = datetime()
        """
        async with self.driver.session() as session:
            await session.run(query, run_id=run.run_id, workflow_name=run.workflow_name, pipeline_version=run.pipeline_version, input_versions=json.dumps(run.input_versions, sort_keys=True), output_asset_id=run.output_asset_id, environment=json.dumps(run.environment, sort_keys=True), parameters=json.dumps(run.parameters, sort_keys=True))

    async def get_run_spec(self, run_id: str) -> dict[str, Any] | None:
        async with self.driver.session() as session:
            result = await session.run("MATCH (run:PipelineRun {id: $run_id}) RETURN properties(run) AS run", run_id=run_id)
            record = await result.single()
        return record["run"] if record else None

    async def trace(self, asset_id: str, direction: str = "upstream", depth: int = 12) -> dict[str, list[dict[str, Any]]]:
        traversal = {
            "upstream": "(asset:ProvenanceAsset)-[:LINEAGE*0..%d]->(root:ProvenanceAsset {id: $asset_id})" % depth,
            "downstream": "(root:ProvenanceAsset {id: $asset_id})-[:LINEAGE*0..%d]->(asset:ProvenanceAsset)" % depth,
            "all": "(asset:ProvenanceAsset)-[:LINEAGE*0..%d]-(root:ProvenanceAsset {id: $asset_id})" % depth,
        }.get(direction)
        if traversal is None:
            raise ValueError("direction must be upstream, downstream, or all")
        async with self.driver.session() as session:
            result = await session.run(f"MATCH {traversal} RETURN DISTINCT properties(asset) AS asset", asset_id=asset_id)
            nodes = [record["asset"] async for record in result]
            ids = [node["id"] for node in nodes]
            edge_result = await session.run("MATCH (source:ProvenanceAsset)-[edge:LINEAGE]->(target:ProvenanceAsset) WHERE source.id IN $ids AND target.id IN $ids RETURN properties(edge) AS edge, source.id AS source, target.id AS target", ids=ids)
            edges = [{**record["edge"], "source": record["source"], "target": record["target"]} async for record in edge_result]
        return {"nodes": nodes, "edges": edges}
