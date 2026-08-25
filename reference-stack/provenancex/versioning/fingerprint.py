from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from typing import Any


def fingerprint(value: Any) -> str:
    """Creates a stable SHA-256 fingerprint for materialized records or specifications."""
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def dataset_version(dataset_name: str, records: list[Mapping[str, Any]]) -> tuple[str, str]:
    checksum = fingerprint(records)
    return f"{dataset_name}@sha256:{checksum[:12]}", checksum


def pipeline_version(source_revision: str, parameters: Mapping[str, Any]) -> str:
    return f"pipeline@{source_revision}+{fingerprint(parameters)[:10]}"
