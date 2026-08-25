import { describe, expect, it } from "vitest";
import { traceNode } from "../shared/provenance";

describe("staleness path", () => {
  it("exposes the changed raw orders asset in the result's upstream lineage", () => {
    const graph = traceNode("result-risk", "upstream");
    const causes = graph.nodes.filter(node => node.status === "changed" || node.status === "stale");
    expect(causes.map(node => node.name)).toContain("orders_raw");
  });
});
