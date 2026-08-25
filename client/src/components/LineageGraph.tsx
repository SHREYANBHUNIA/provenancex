import CytoscapeComponent from "react-cytoscapejs";
import type { Core, ElementDefinition } from "cytoscape";
import type { ProvenanceEdge, ProvenanceNode } from "@shared/provenance";
import { useEffect, useMemo, useRef } from "react";

const accentByKind: Record<ProvenanceNode["kind"], string> = {
  dataset: "#61d9b5",
  transformation: "#85a7ff",
  feature: "#c59bff",
  model: "#ffbd68",
  run: "#6fe3f0",
  result: "#ff7f95",
  job: "#a6b0c7",
};

const iconByKind: Record<ProvenanceNode["kind"], string> = {
  dataset: "DATASET",
  transformation: "TRANSFORM",
  feature: "FEATURES",
  model: "MODEL",
  run: "RUN",
  result: "RESULT",
  job: "JOB",
};

export function LineageGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const cyRef = useRef<Core | null>(null);
  const elements = useMemo<ElementDefinition[]>(() => [
    ...nodes.map(node => ({
      data: {
        id: node.id,
        label: node.name,
        type: iconByKind[node.kind],
        version: node.version,
        status: node.status,
        color: accentByKind[node.kind],
      },
      classes: `${node.status} ${node.id === selectedId ? "selected" : ""}`,
    })),
    ...edges.map(edge => ({ data: { id: edge.id, source: edge.source, target: edge.target, label: edge.label } })),
  ], [nodes, edges, selectedId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.off("tap", "node");
    cy.on("tap", "node", event => onSelect(event.target.id()));
    cy.layout({ name: "breadthfirst", directed: true, padding: 50, spacingFactor: 1.28, animate: false }).run();
    return () => {
      cy.off("tap", "node");
    };
  }, [onSelect, elements]);

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#121a2f",
        "border-width": 1.5,
        "border-color": "data(color)",
        "border-opacity": 0.75,
        label: "data(label)",
        color: "#dce6ff",
        "font-size": 11,
        "font-family": "DM Sans, sans-serif",
        "font-weight": 600,
        "text-wrap": "wrap",
        "text-max-width": "118px",
        "text-valign": "center",
        "text-halign": "center",
        "overlay-opacity": 0,
        width: 128,
        height: 58,
        shape: "round-rectangle",
      },
    },
    { selector: "node.stale", style: { "border-width": 2.5, "border-color": "#f98798", "background-color": "#24182b" } },
    { selector: "node.changed", style: { "border-width": 2.5, "border-color": "#ffbd68", "background-color": "#292018" } },
    { selector: "node.selected", style: { "border-width": 3.5, "border-color": "#8fb6ff", "background-color": "#192a4e" } },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "line-color": "#425373",
        "target-arrow-color": "#7186ac",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        color: "#8d9ab5",
        "font-size": 8,
        "font-family": "DM Mono, monospace",
        "text-background-color": "#0d1325",
        "text-background-opacity": 1,
        "text-background-padding": 2,
      },
    },
  ];

  return (
    <div className="lineage-graph" aria-label="Interactive data lineage graph">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
        cy={(cy: Core) => { cyRef.current = cy; }}
        wheelSensitivity={0.16}
      />
    </div>
  );
}
