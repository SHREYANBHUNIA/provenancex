from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pandas as pd
import polars as pl

from collector.contracts import AssetKind, AssetStatus, Dependency, PipelineRunSpec, ProvenanceAsset
from collector.service import ProvenanceCollector
from versioning.fingerprint import dataset_version, pipeline_version


def materialize_revenue_risk() -> dict[str, Any]:
    """Runs the deterministic Polars-to-Pandas data-to-model calculation used for capture and replay."""
    orders = pl.DataFrame({"order_id": ["o-101", "o-102", "o-103", "o-104"], "customer_id": ["c-01", "c-01", "c-02", "c-03"], "amount": [120.0, 35.0, 68.0, 14.0], "event_ts": ["2025-02-18T08:01:00Z", "2025-02-18T08:04:00Z", "2025-02-18T08:05:00Z", "2025-02-18T08:09:00Z"]})
    customers = pd.DataFrame({"customer_id": ["c-01", "c-02", "c-03"], "tenure_days": [540, 64, 22], "segment": ["core", "growth", "new"]})
    order_records, customer_records = orders.to_dicts(), customers.to_dict(orient="records")
    orders_version, orders_checksum = dataset_version("orders_raw", order_records)
    customers_version, customers_checksum = dataset_version("customers_raw", customer_records)
    clean = orders.unique(subset=["order_id"]).with_columns(pl.col("amount").cast(pl.Float64))
    customer_spend = clean.group_by("customer_id").agg(pl.col("amount").sum().alias("lifetime_spend")).to_pandas()
    features = customers.merge(customer_spend, on="customer_id", how="left").fillna({"lifetime_spend": 0.0})
    features["risk_signal"] = ((features["tenure_days"] < 90).astype(int) + (features["lifetime_spend"] < 50).astype(int)).clip(upper=1)
    feature_records = features.to_dict(orient="records")
    features_version, features_checksum = dataset_version("customer_360_features", feature_records)
    predictions = features[["customer_id", "risk_signal"]].copy()
    predictions["risk_score"] = (0.21 + 0.53 * predictions["risk_signal"]).round(2)
    prediction_records = predictions.to_dict(orient="records")
    output_version, output_checksum = dataset_version("q1_retention_risk", prediction_records)
    return {
        "orders_version": orders_version,
        "orders_checksum": orders_checksum,
        "customers_version": customers_version,
        "customers_checksum": customers_checksum,
        "features_version": features_version,
        "features_checksum": features_checksum,
        "output_version": output_version,
        "output_checksum": output_checksum,
        "prediction_count": len(predictions),
        "input_rows": orders.height,
        "feature_columns": list(features.columns),
        "environment": {"python": "3.12", "polars": pl.__version__, "pandas": pd.__version__},
    }


async def run_revenue_risk_example(collector: ProvenanceCollector) -> PipelineRunSpec:
    """Captures a concrete pipeline then uses the graph to propagate the source-version change."""
    materialized = materialize_revenue_risk()
    orders_asset = ProvenanceAsset(id="dataset:orders_raw:2025-02-18", kind=AssetKind.DATASET, name="orders_raw", version=materialized["orders_version"], status=AssetStatus.CHANGED, checksum=materialized["orders_checksum"], owner="Data Platform", metadata={"engine": "polars", "rows": materialized["input_rows"]})
    customer_asset = ProvenanceAsset(id="dataset:customers_raw:2025-02-18", kind=AssetKind.DATASET, name="customers_raw", version=materialized["customers_version"], checksum=materialized["customers_checksum"], owner="Data Platform", metadata={"engine": "pandas", "rows": 3})
    clean_asset = ProvenanceAsset(id="transform:clean_orders:9a4e2c1", kind=AssetKind.TRANSFORMATION, name="clean_orders", version="sha:9a4e2c1", owner="Revenue Analytics", metadata={"engine": "polars", "input_rows": materialized["input_rows"]})
    feature_asset = ProvenanceAsset(id="feature:customer_360:17", kind=AssetKind.FEATURE, name="customer_360_features", version=materialized["features_version"], checksum=materialized["features_checksum"], owner="ML Platform", metadata={"engine": "pandas", "entities": 3, "columns": materialized["feature_columns"]})
    model_asset = ProvenanceAsset(id="model:churn_risk_xgb:4.2.1", kind=AssetKind.MODEL, name="churn_risk_xgb", version="model:v4.2.1", owner="Applied ML", metadata={"algorithm": "xgboost", "feature_set": feature_asset.version})
    result_asset = ProvenanceAsset(id="result:q1_retention_risk:2025-W08", kind=AssetKind.RESULT, name="q1_retention_risk", version=materialized["output_version"], checksum=materialized["output_checksum"], owner="Revenue Operations", metadata={"rows": materialized["prediction_count"], "destination": "bi.retention_risk"})
    for asset in [orders_asset, customer_asset, clean_asset, feature_asset, model_asset, result_asset]:
        await collector.record_asset(asset)
    for dependency in [
        Dependency(id="edge:orders-clean", source_asset_id=orders_asset.id, target_asset_id=clean_asset.id, relation="INPUT_TO"),
        Dependency(id="edge:clean-features", source_asset_id=clean_asset.id, target_asset_id=feature_asset.id, relation="PRODUCES"),
        Dependency(id="edge:customers-features", source_asset_id=customer_asset.id, target_asset_id=feature_asset.id, relation="JOINS"),
        Dependency(id="edge:features-model", source_asset_id=feature_asset.id, target_asset_id=model_asset.id, relation="TRAINS_OR_SCORES"),
        Dependency(id="edge:model-result", source_asset_id=model_asset.id, target_asset_id=result_asset.id, relation="PUBLISHES"),
    ]:
        await collector.record_dependency(dependency)
    await collector.propagate_staleness(orders_asset.id)
    run = PipelineRunSpec(run_id="wf-2025-02-18-0917", workflow_name="reproduce_revenue_risk", pipeline_version=pipeline_version("9a4e2c1", {"duplicate_policy": "latest_event", "feature_sla_hours": 6}), input_versions={"orders_raw": materialized["orders_version"], "customers_raw": materialized["customers_version"]}, output_asset_id=result_asset.id, environment=materialized["environment"], parameters={"as_of": datetime.now(UTC).isoformat(), "duplicate_policy": "latest_event"})
    await collector.record_run(run)
    return run


def replay_revenue_risk_from_spec(specification: dict[str, Any]) -> dict[str, Any]:
    """Reruns the materialization and verifies that the captured input versions still match exactly."""
    materialized = materialize_revenue_risk()
    expected_inputs = specification["input_versions"]
    actual_inputs = {"orders_raw": materialized["orders_version"], "customers_raw": materialized["customers_version"]}
    mismatches = {name: {"expected": expected, "actual": actual_inputs.get(name)} for name, expected in expected_inputs.items() if actual_inputs.get(name) != expected}
    if mismatches:
        return {"status": "cannot_reproduce", "reason": "recorded input versions are unavailable", "mismatches": mismatches}
    return {"status": "reproduced", "pipeline_version": specification["pipeline_version"], "input_versions": actual_inputs, "output_version": materialized["output_version"], "output_checksum": materialized["output_checksum"], "prediction_count": materialized["prediction_count"]}
