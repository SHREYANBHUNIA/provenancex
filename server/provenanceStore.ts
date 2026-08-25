import { lineageEdges, pipelineRuns, provenanceAssets } from "../drizzle/schema";
import { getDb } from "./db";

/** Database read adapter; showcase data remains the explicit empty-database state. */
export async function loadProvenanceSnapshot() {
  const db = await getDb();
  if (!db) return null;
  const [assets, edges, runs] = await Promise.all([db.select().from(provenanceAssets), db.select().from(lineageEdges), db.select().from(pipelineRuns)]);
  return { assets, edges, runs };
}

export async function loadAssetTrace(assetId: string, direction: "upstream" | "downstream" | "all") {
  const snapshot = await loadProvenanceSnapshot();
  if (!snapshot || snapshot.assets.length === 0) return null;
  const known = new Set<string>([assetId]);
  const queue = [assetId];
  while (queue.length) {
    const current = queue.shift()!;
    snapshot.edges.forEach(edge => {
      const isUpstream = edge.targetAssetId === current;
      const isDownstream = edge.sourceAssetId === current;
      if ((direction === "upstream" && !isUpstream) || (direction === "downstream" && !isDownstream) || (direction === "all" && !isUpstream && !isDownstream)) return;
      const next = isUpstream ? edge.sourceAssetId : edge.targetAssetId;
      if (!known.has(next)) { known.add(next); queue.push(next); }
    });
  }
  return { nodes: snapshot.assets.filter(asset => known.has(asset.id)), edges: snapshot.edges.filter(edge => known.has(edge.sourceAssetId) && known.has(edge.targetAssetId)) };
}
