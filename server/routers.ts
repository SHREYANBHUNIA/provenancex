import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { buildReport, datasetHistory, pipelineVersions, provenanceEdges, provenanceNodes, runHistory, traceNode } from "@shared/provenance";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { loadAssetTrace, loadProvenanceSnapshot } from "./provenanceStore";

function mapPersistedGraph(snapshot: NonNullable<Awaited<ReturnType<typeof loadProvenanceSnapshot>>>) {
  return {
    nodes: snapshot.assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      version: asset.version,
      status: asset.status,
      updatedAt: asset.updatedAt.toISOString(),
      description: asset.description ?? "",
      owner: asset.owner ?? "Unassigned",
      checksum: asset.checksum ?? undefined,
      metadata: (asset.metadata as Record<string, string>) ?? {},
    })),
    edges: snapshot.edges.map(edge => ({ id: edge.id, source: edge.sourceAssetId, target: edge.targetAssetId, label: edge.relation })),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  provenance: router({
    overview: publicProcedure.query(async () => {
      const snapshot = await loadProvenanceSnapshot();
      const graph = snapshot?.assets.length ? mapPersistedGraph(snapshot) : { nodes: provenanceNodes, edges: provenanceEdges };
      const staleCount = graph.nodes.filter(node => node.status === "stale").length;
      return {
      metrics: [
        { label: "Tracked assets", value: String(snapshot?.assets.length || 148), change: snapshot?.assets.length ? "Persisted records" : "+12 this week", tone: "neutral" },
        { label: "Freshness coverage", value: "96.2%", change: "+1.4% vs last week", tone: "positive" },
        { label: "Stale outputs", value: String(snapshot?.assets.length ? staleCount : 6).padStart(2, "0"), change: "2 require review", tone: "warning" },
        { label: "Replayable runs", value: "91", change: "100% of 7-day runs", tone: "positive" },
      ],
      graph,
      datasetHistory,
      runHistory,
      pipelineVersions,
      alert: {
        title: "A source version invalidated a published result",
        description: "orders_raw v2025.02.18 changed after q1_retention_risk was materialized. Four downstream assets now require review.",
        sourceId: "dataset-orders",
        resultId: "result-risk",
      },
    };
    }),
    trace: publicProcedure.input(z.object({ id: z.string(), direction: z.enum(["upstream", "downstream", "all"]) })).query(async ({ input }) => {
      const persisted = await loadAssetTrace(input.id, input.direction);
      if (!persisted) return traceNode(input.id, input.direction);
      return {
        nodes: persisted.nodes.map(asset => ({
          id: asset.id,
          name: asset.name,
          kind: asset.kind,
          version: asset.version,
          status: asset.status,
          updatedAt: asset.updatedAt.toISOString(),
          description: asset.description ?? "",
          owner: asset.owner ?? "Unassigned",
          checksum: asset.checksum ?? undefined,
          metadata: (asset.metadata as Record<string, string>) ?? {},
        })),
        edges: persisted.edges.map(edge => ({ id: edge.id, source: edge.sourceAssetId, target: edge.targetAssetId, label: edge.relation })),
      };
    }),
    report: publicProcedure.input(z.object({ entityId: z.string() })).query(({ input }) => buildReport(input.entityId)),
    compare: publicProcedure.input(z.object({ baseline: z.string(), candidate: z.string() })).query(({ input }) => ({
      baseline: pipelineVersions.find(version => version.version === input.baseline) ?? pipelineVersions[1],
      candidate: pipelineVersions.find(version => version.version === input.candidate) ?? pipelineVersions[0],
      changedStages: [
        { stage: "clean_orders", change: "Duplicate policy", before: "keep_first", after: "latest_event" },
        { stage: "customer_360_features", change: "Freshness SLA", before: "12 hours", after: "6 hours" },
        { stage: "orders_raw", change: "Schema contract", before: "orders@3.3", after: "orders@3.4" },
      ],
    })),
  }),
});

export type AppRouter = typeof appRouter;
