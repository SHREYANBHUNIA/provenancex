export type ProvenanceKind = "dataset" | "transformation" | "feature" | "model" | "run" | "result" | "job";
export type ProvenanceStatus = "fresh" | "stale" | "changed" | "running" | "archived";

export type ProvenanceNode = {
  id: string;
  name: string;
  kind: ProvenanceKind;
  version: string;
  status: ProvenanceStatus;
  updatedAt: string;
  description: string;
  owner: string;
  rows?: string;
  checksum?: string;
  runtime?: string;
  metadata: Record<string, string>;
};

export type ProvenanceEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type PipelineVersion = {
  version: string;
  createdAt: string;
  author: string;
  status: "current" | "previous";
  transforms: number;
  inputs: number;
  output: string;
  changes: string[];
};

export const provenanceNodes: ProvenanceNode[] = [
  {
    id: "dataset-orders",
    name: "orders_raw",
    kind: "dataset",
    version: "v2025.02.18",
    status: "changed",
    updatedAt: "14 minutes ago",
    description: "Source-of-record commerce order events ingested from the warehouse.",
    owner: "Data Platform",
    rows: "18.4M rows",
    checksum: "a7d9…2fe1",
    metadata: { source: "warehouse.orders", partition: "2025-02-18", contract: "orders@3.4" },
  },
  {
    id: "dataset-customers",
    name: "customers_raw",
    kind: "dataset",
    version: "v2025.02.18",
    status: "fresh",
    updatedAt: "24 minutes ago",
    description: "Canonical customer profile snapshot keyed by customer identifier.",
    owner: "Data Platform",
    rows: "4.1M rows",
    checksum: "31ad…c80e",
    metadata: { source: "warehouse.customers", partition: "2025-02-18", contract: "customers@5.1" },
  },
  {
    id: "job-ingest",
    name: "warehouse_sync",
    kind: "job",
    version: "run-8342",
    status: "fresh",
    updatedAt: "27 minutes ago",
    description: "Incremental warehouse ingestion and contract validation job.",
    owner: "Ingestion Service",
    runtime: "Polars · 2m 14s",
    metadata: { executor: "ingest-worker-12", attempt: "1", environment: "production" },
  },
  {
    id: "transform-clean",
    name: "clean_orders",
    kind: "transformation",
    version: "sha:9a4e2c1",
    status: "changed",
    updatedAt: "12 minutes ago",
    description: "Normalizes order events, removes duplicates, and applies the order schema contract.",
    owner: "Revenue Analytics",
    runtime: "Pandas · 48s",
    metadata: { code: "pipelines/revenue/clean_orders.py", image: "revenue:2.8.0", contract: "orders_clean@3.0" },
  },
  {
    id: "feature-360",
    name: "customer_360_features",
    kind: "feature",
    version: "feature-set:17",
    status: "stale",
    updatedAt: "11 minutes ago",
    description: "Customer spend, tenure, recency, and fulfilment behavior features.",
    owner: "ML Platform",
    rows: "4.1M entities",
    metadata: { store: "feature-store/customer_360", freshnessSla: "6h", entities: "customer_id" },
  },
  {
    id: "model-churn",
    name: "churn_risk_xgb",
    kind: "model",
    version: "model:v4.2.1",
    status: "stale",
    updatedAt: "9 minutes ago",
    description: "Gradient-boosted churn propensity model registered for weekly scoring.",
    owner: "Applied ML",
    runtime: "XGBoost · AUC 0.842",
    metadata: { registry: "models/churn_risk_xgb", featureSpec: "customer_360@17", trainingData: "2025-02-11" },
  },
  {
    id: "run-score",
    name: "weekly_risk_scoring",
    kind: "run",
    version: "wf-2025-02-18-0917",
    status: "stale",
    updatedAt: "8 minutes ago",
    description: "Recorded workflow run producing customer-level risk predictions.",
    owner: "Workflow Orchestrator",
    runtime: "Temporal · 3m 08s",
    metadata: { workflow: "score_customers", queue: "ml-inference", replayable: "true" },
  },
  {
    id: "result-risk",
    name: "q1_retention_risk",
    kind: "result",
    version: "report:2025-W08",
    status: "stale",
    updatedAt: "7 minutes ago",
    description: "Published retention-risk output used by the revenue operations report.",
    owner: "Revenue Operations",
    rows: "4.1M predictions",
    metadata: { destination: "bi.retention_risk", report: "Q1 Retention Review", audience: "RevOps" },
  },
];

export const provenanceEdges: ProvenanceEdge[] = [
  { id: "e-orders-job", source: "dataset-orders", target: "job-ingest", label: "ingested by" },
  { id: "e-customers-job", source: "dataset-customers", target: "job-ingest", label: "ingested by" },
  { id: "e-job-clean", source: "job-ingest", target: "transform-clean", label: "runs" },
  { id: "e-orders-clean", source: "dataset-orders", target: "transform-clean", label: "input to" },
  { id: "e-customers-feature", source: "dataset-customers", target: "feature-360", label: "joins" },
  { id: "e-clean-feature", source: "transform-clean", target: "feature-360", label: "produces" },
  { id: "e-feature-model", source: "feature-360", target: "model-churn", label: "feeds" },
  { id: "e-model-run", source: "model-churn", target: "run-score", label: "executes" },
  { id: "e-run-result", source: "run-score", target: "result-risk", label: "publishes" },
];

export const pipelineVersions: PipelineVersion[] = [
  {
    version: "v2.8.0",
    createdAt: "18 Feb 2025 · 09:12 UTC",
    author: "I. Hart",
    status: "current",
    transforms: 5,
    inputs: 2,
    output: "q1_retention_risk",
    changes: ["Duplicate-key policy updated", "Schema contract orders@3.4", "Feature freshness threshold reduced to 6h"],
  },
  {
    version: "v2.7.4",
    createdAt: "11 Feb 2025 · 09:10 UTC",
    author: "I. Hart",
    status: "previous",
    transforms: 4,
    inputs: 2,
    output: "q1_retention_risk",
    changes: ["Prior stable production version", "Feature freshness threshold: 12h"],
  },
];

export const runHistory = [
  { id: "wf-2025-02-18-0917", label: "weekly_risk_scoring", time: "09:17 UTC", status: "stale", duration: "3m 08s", note: "Upstream input changed after run" },
  { id: "wf-2025-02-17-0916", label: "weekly_risk_scoring", time: "17 Feb · 09:16 UTC", status: "fresh", duration: "3m 04s", note: "Reproducible" },
  { id: "wf-2025-02-16-0915", label: "weekly_risk_scoring", time: "16 Feb · 09:15 UTC", status: "fresh", duration: "3m 06s", note: "Reproducible" },
];

export const datasetHistory = [
  { version: "v2025.02.18", time: "09:03 UTC", rows: "18.4M", status: "changed", checksum: "a7d9…2fe1", note: "3 columns changed" },
  { version: "v2025.02.17", time: "17 Feb · 09:02 UTC", rows: "18.3M", status: "fresh", checksum: "f16c…8a7d", note: "Verified" },
  { version: "v2025.02.16", time: "16 Feb · 09:01 UTC", rows: "18.1M", status: "fresh", checksum: "fe90…4ea", note: "Verified" },
];

export function getNode(id: string) {
  return provenanceNodes.find(node => node.id === id) ?? provenanceNodes[provenanceNodes.length - 1];
}

export function traceNode(id: string, direction: "upstream" | "downstream" | "all") {
  const visited = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    const related = provenanceEdges.filter(edge =>
      direction === "upstream" ? edge.target === current : direction === "downstream" ? edge.source === current : edge.target === current || edge.source === current,
    );
    related.forEach(edge => {
      const next = edge.source === current ? edge.target : edge.source;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
  // A terminal result has no downstream dependents. In that case, surface its complete
  // causal path instead of rendering an effectively empty one-node graph.
  if (direction === "downstream" && visited.size === 1) {
    return traceNode(id, "upstream");
  }
  return {
    nodes: provenanceNodes.filter(node => visited.has(node.id)),
    edges: provenanceEdges.filter(edge => visited.has(edge.source) && visited.has(edge.target)),
  };
}

export function buildReport(entityId: string) {
  const entity = getNode(entityId);
  const graph = traceNode(entity.id, "upstream");
  const staleAncestors = graph.nodes.filter(node => node.status === "changed" || node.status === "stale");
  return {
    title: `${entity.name} provenance report`,
    generatedAt: "18 Feb 2025 · 09:31 UTC",
    subject: entity,
    upstreamAssets: graph.nodes.length - 1,
    integrity: entity.status === "fresh" ? "Verified" : "Attention required",
    staleReason: entity.status === "fresh" ? "No upstream freshness violations detected." : "orders_raw v2025.02.18 changed after this output was materialized.",
    staleAncestors,
    reproduction: {
      workflow: "score_customers",
      runId: "wf-2025-02-18-0917",
      specification: "pipeline:revenue-risk@v2.8.0",
      environment: "python=3.12 · polars=1.12 · image=revenue:2.8.0",
    },
  };
}
