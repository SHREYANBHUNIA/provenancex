import { describe, expect, it } from "vitest";
import { buildReport, traceNode } from "../shared/provenance";

describe("provenance lineage helpers", () => {
  it("follows a reported result to its upstream sources", () => {
    const trace = traceNode("result-risk", "upstream");
    expect(trace.nodes.map(node => node.id)).toContain("dataset-orders");
    expect(trace.nodes.map(node => node.id)).toContain("model-churn");
    expect(trace.edges).toHaveLength(9);
  });

  it("marks the report as requiring attention when its source changed", () => {
    const report = buildReport("result-risk");
    expect(report.integrity).toBe("Attention required");
    expect(report.staleReason).toContain("orders_raw");
    expect(report.reproduction.workflow).toBe("score_customers");
  });
});
