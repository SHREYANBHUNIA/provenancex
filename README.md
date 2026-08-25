# ProvenanceX

> **A data-lineage and reproducibility engine for tracing a published number back through its exact datasets, transformations, features, models, and recorded pipeline run.**

ProvenanceX makes the question *“Where did this result come from?”* navigable. The hosted dashboard provides an interactive, dark-mode lineage workspace for inspecting graph relationships, asset metadata, stale-data causes, run history, pipeline differences, and exportable provenance reports. A companion local reference stack supplies the requested Python, FastAPI, Neo4j, Temporal, Pandas, and Polars architecture for live end-to-end capture and replay.

## What is included

| Area | Delivered capability |
| --- | --- |
| Interactive dashboard | A React dashboard with Cytoscape.js lineage visualization, metadata inspection, upstream/downstream traversal, run history, and freshness states. |
| Provenance model | Dataset, transformation, feature, model, job, run, result, dependency, and pipeline-version contracts. |
| Staleness intelligence | A visual stale-output alert and explicit upstream causes for an affected result. |
| Comparison and reporting | Pipeline-version change comparison, compact provenance report, Markdown report export, and replay controls. |
| Managed persistence | Drizzle schema and database tables for provenance assets, directed lineage edges, and pipeline-run specifications. |
| Local reference implementation | A Docker-based FastAPI, Neo4j, and Temporal environment with a concrete Pandas/Polars capture pipeline and reproducible workflow. |

## Dashboard workflow

The dashboard opens on a retention-risk pipeline. Select any graph asset to inspect its version, owner, status, and runtime metadata. Switch between **upstream**, **downstream**, and **all** relationships to control the graph traversal. When an upstream source changes, ProvenanceX marks dependent assets stale and surfaces the chain that requires review.

The **Provenance report** action creates a readable record for the selected asset, including its integrity finding, upstream asset count, replay specification, recorded environment, and a browser-downloadable Markdown export. **Compare versions** presents material changes between two pipeline definitions before a replay is queued.

## Architecture boundary

The dashboard is directly runnable in the managed web application. FastAPI, Neo4j, and Temporal are provided in `reference-stack/` as a live local environment because those services require a Python/container-capable runtime separate from the dashboard host.

```text
Raw datasets ──▶ Pandas / Polars transforms ──▶ features ──▶ model ──▶ result
      │                    │                       │             │
      └────────────── collector records assets, versions, and directed edges
                                           │
                                      Neo4j lineage graph
                                           │
                           FastAPI query + capture interface
                                           │
                         Temporal durable reproduction workflow
```

## Local end-to-end demonstration

The local reference stack lives in [`reference-stack/`](./reference-stack/README.md). With Docker available, run the following commands from that directory.

```bash
docker compose up --build
```

Once the services are healthy, use the FastAPI interface at `http://localhost:8000/docs` and call `POST /api/v1/examples/revenue-risk`. The example records raw-order and customer datasets, fingerprints their versions, performs a Polars cleaning step, performs a Pandas feature-engineering step, creates model and result dependencies, records a replayable run specification, and persists the graph in Neo4j.

| Endpoint | Demonstrates |
| --- | --- |
| `POST /api/v1/assets` | Recording a versioned provenance asset. |
| `POST /api/v1/dependencies` | Recording directed lineage relationships. |
| `POST /api/v1/runs` | Capturing inputs, environment, output, and replay metadata for a pipeline run. |
| `GET /api/v1/lineage/{asset_id}` | Querying upstream, downstream, or complete lineage. |
| `GET /api/v1/staleness/{asset_id}` | Identifying changed or stale upstream causes. |
| `POST /api/v1/reproduce/{run_id}` | Starting a Temporal replay from the recorded specification. |

## Project layout

```text
provenancex/
├── client/                  # React dashboard and Cytoscape.js visualization
├── server/                  # Typed procedures, managed persistence adapter, and tests
├── drizzle/                 # Provenance asset, lineage edge, and pipeline-run schema
├── shared/                  # Dashboard provenance contracts and showcase graph
├── reference-stack/         # Live local FastAPI, Neo4j, Temporal, Pandas, and Polars stack
│   └── provenancex/
│       ├── collector/       # Event contracts and capture facade
│       ├── pipeline/        # Example pipeline and Temporal worker
│       ├── lineage/         # Graph traversal and stale-cause service
│       ├── graph/           # Neo4j adapter
│       ├── reproducibility/ # Durable replay workflow and activity
│       ├── versioning/      # Immutable fingerprints and version helpers
│       ├── api/             # FastAPI application
│       └── examples/        # API consumer demonstration
└── todo.md                  # Verifiable implementation checklist
```

## Verification

The project includes Vitest coverage for graph traversal, stale-result reporting, and causal path detection. The local example has a Python unit test that validates the full capture chain without needing external services. The delivered build has been checked with the following commands.

```bash
pnpm test
pnpm check
pnpm build
cd reference-stack/provenancex && python3 -m unittest tests.test_revenue_risk
```

## Product positioning

ProvenanceX is designed as a portfolio-grade project at the intersection of **data engineering**, **MLOps**, **workflow orchestration**, and **graph-based observability**. The implementation deliberately separates a visually demonstrable dashboard from the container-capable reference services, so the project is easy to review while retaining a credible path to live lineage capture and reproducible orchestration.
