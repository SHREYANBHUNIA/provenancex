declare module "react-cytoscapejs" {
  import type React from "react";
  import type { Core, ElementDefinition } from "cytoscape";

  type CytoscapeComponentProps = {
    elements: ElementDefinition[];
    stylesheet?: unknown;
    style?: React.CSSProperties;
    cy?: (cy: Core) => void;
    wheelSensitivity?: number;
  };

  const CytoscapeComponent: React.ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
