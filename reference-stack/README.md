# ProvenanceX Local Reference Stack

This directory contains the **live local implementation** of the ProvenanceX architecture. It is deliberately separate from the managed dashboard so the dashboard remains immediately reviewable while FastAPI, Neo4j, and Temporal run in a container-capable local environment.

| Service | Purpose | Local endpoint |
| --- | --- | --- |
| Provenance API | Records datasets, transformations, jobs, dependencies, lineage queries, and replay requests. | `http://localhost:8000/docs` |
| Neo4j | Persists directed data-to-model lineage relationships. | `http://localhost:7474` |
| Temporal | Runs durable replay workflows from captured pipeline specifications. | `localhost:7233` |

## Start the stack

From this directory, use `docker compose up --build`. Once the services are healthy, open the FastAPI documentation at `http://localhost:8000/docs` and invoke `POST /api/v1/examples/revenue-risk`. This executes the bundled Pandas and Polars example, fingerprints every materialized asset, creates the directed graph, and returns a replayable run specification.

## Structure

```text
provenancex/
├── collector/         # Provenance event contracts and recording facade
├── pipeline/          # Pandas/Polars pipeline and Temporal worker
├── lineage/           # Query-oriented lineage service
├── graph/             # Neo4j persistence adapter
├── reproducibility/   # Replay workflows and activities
├── versioning/        # Immutable version and checksum helpers
├── api/               # FastAPI application
├── dashboard/         # Bridge notes for the React dashboard
└── examples/          # Local API invocation example
```

The sample uses intentionally small, illustrative commerce records so its version fingerprints, dependencies, staleness propagation, and replay behavior are transparent during a local demonstration.
