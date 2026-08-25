# Project TODO

- [x] Define the hybrid deployment boundary for the hosted dashboard and the local Python/Neo4j/Temporal reference stack.
- [x] Implement a provenance domain model for datasets, dataset versions, transformations, processing jobs, model runs, reported results, and dependencies.
- [x] Add typed backend procedures that serve the dashboard overview, lineage graph, history, stale-data causes, comparison, reproduction metadata, and reports.
- [x] Build a refined dark-mode dashboard shell with responsive navigation and operational summary metrics.
- [x] Build an interactive Cytoscape.js lineage canvas with node metadata, upstream/downstream tracing, graph controls, and accessible status legends.
- [x] Build dataset and job history views with version details, freshness state, run inputs and outputs, and causal upstream changes.
- [x] Build pipeline-version comparison and selected-entity provenance report views.
- [x] Create a Python FastAPI collector and pipeline reference implementation for recording provenance events.
- [x] Create Neo4j graph persistence and query adapters for lineage construction and traversal.
- [x] Create Temporal workflow definitions that reproduce a recorded pipeline run from its captured specification.
- [x] Create a local-first Pandas/Polars example pipeline showing version capture, dependency construction, stale-data propagation, and reproduction.
- [x] Add setup documentation for local services and example execution.
- [x] Add Vitest coverage for backend domain behavior and run the project test, type-check, and build checks.
- [x] Verify desktop and mobile interface rendering, update completion status, and save a delivery checkpoint.
