# Dashboard Integration Boundary

The production-facing React dashboard lives in the parent web application. The local FastAPI service exposes lineage, stale-cause, and reproduction endpoints designed to replace the dashboard showcase adapter when a live graph service is available.
