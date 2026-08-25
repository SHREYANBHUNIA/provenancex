from __future__ import annotations

import asyncio
import os

from temporalio.client import Client
from temporalio.worker import Worker

from reproducibility.activities import reproduce_recorded_pipeline
from reproducibility.workflow import ReproduceRecordedPipeline


async def main() -> None:
    client = await Client.connect(os.getenv("TEMPORAL_HOST", "localhost:7233"))
    async with Worker(client, task_queue=os.getenv("TEMPORAL_TASK_QUEUE", "provenancex-reproduction"), workflows=[ReproduceRecordedPipeline], activities=[reproduce_recorded_pipeline]):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
