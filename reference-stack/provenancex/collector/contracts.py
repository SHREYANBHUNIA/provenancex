from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class AssetKind(StrEnum):
    DATASET = "dataset"
    TRANSFORMATION = "transformation"
    FEATURE = "feature"
    MODEL = "model"
    RUN = "run"
    RESULT = "result"
    JOB = "job"


class AssetStatus(StrEnum):
    FRESH = "fresh"
    STALE = "stale"
    CHANGED = "changed"
    RUNNING = "running"
    ARCHIVED = "archived"


class ProvenanceAsset(BaseModel):
    id: str
    kind: AssetKind
    name: str
    version: str
    status: AssetStatus = AssetStatus.FRESH
    owner: str | None = None
    checksum: str | None = None
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Dependency(BaseModel):
    id: str
    source_asset_id: str
    target_asset_id: str
    relation: str = "LINEAGE"
    metadata: dict[str, Any] = Field(default_factory=dict)


class PipelineRunSpec(BaseModel):
    run_id: str
    workflow_name: str
    pipeline_version: str
    input_versions: dict[str, str]
    output_asset_id: str
    environment: dict[str, str]
    parameters: dict[str, Any] = Field(default_factory=dict)
