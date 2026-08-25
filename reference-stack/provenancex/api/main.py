from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from temporalio.client import Client

from collector.contracts import Dependency, PipelineRunSpec, ProvenanceAsset
from collector.service import ProvenanceCollector
from graph.neo4j_store import Neo4jLineageStore
from lineage.service import LineageService
from pipeline.revenue_risk import run_revenue_risk_example
from reproducibility.workflow import ReproduceRecordedPipeline


def build_store() -> Neo4jLineageStore:
    return Neo4jLineageStore(os.getenv("NEO4J_URI", "neo4j://localhost:7687"), os.getenv("NEO4J_USERNAME", "neo4j"), os.getenv("NEO4J_PASSWORD", "provenancex-local"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = build_store()
    app.state.store = store
    app.state.collector = ProvenanceCollector(store)
    app.state.lineage = LineageService(store)
    yield
    await store.close()


app = FastAPI(title="ProvenanceX API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    try:
        await app.state.store.verify()
        return {"status": "ok", "graph": "connected"}
    except Exception as error:
        return {"status": "degraded", "graph": type(error).__name__}


@app.post("/api/v1/assets", response_model=ProvenanceAsset)
async def record_asset(asset: ProvenanceAsset) -> ProvenanceAsset:
    return await app.state.collector.record_asset(asset)


@app.post("/api/v1/dependencies", response_model=Dependency)
async def record_dependency(dependency: Dependency) -> Dependency:
    return await app.state.collector.record_dependency(dependency)


@app.post("/api/v1/runs", response_model=PipelineRunSpec)
async def record_run(run: PipelineRunSpec) -> PipelineRunSpec:
    return await app.state.collector.record_run(run)


@app.get("/api/v1/lineage/{asset_id}")
async def lineage(asset_id: str, direction: str = Query("upstream", pattern="^(upstream|downstream|all)$")) -> dict:
    return await app.state.lineage.trace(asset_id, direction)


@app.get("/api/v1/staleness/{asset_id}")
async def staleness(asset_id: str) -> dict:
    causes = await app.state.lineage.stale_causes(asset_id)
    return {"asset_id": asset_id, "stale": bool(causes), "causes": causes}


@app.post("/api/v1/reproduce/{run_id}")
async def reproduce(run_id: str) -> dict:
    specification = await app.state.store.get_run_spec(run_id)
    if specification is None:
        raise HTTPException(status_code=404, detail=f"No recorded run specification exists for {run_id}")
    client = await Client.connect(os.getenv("TEMPORAL_HOST", "localhost:7233"))
    handle = await client.start_workflow(ReproduceRecordedPipeline.run, args=[run_id, specification], id=f"replay-{run_id}", task_queue=os.getenv("TEMPORAL_TASK_QUEUE", "provenancex-reproduction"))
    return {"workflow_id": handle.id, "run_id": handle.result_run_id, "replay_of": run_id}


@app.post("/api/v1/examples/revenue-risk", response_model=PipelineRunSpec)
async def run_example() -> PipelineRunSpec:
    return await run_revenue_risk_example(app.state.collector)
