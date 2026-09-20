import { workflowNodes } from "@/lib/demo-data";

function nodeClass(kind: string) { return `workflow-node ${kind}`; }

export function WorkflowDiagram() {
  return (
    <div className="workflow-canvas" role="img" aria-label="Workflow from receive signal to publish edition">
      <svg className="workflow-lines" viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true">
        <path d="M16 45 C20 45, 22 45, 28 45" />
        <path d="M39 45 C44 45, 46 31, 51 25" />
        <path d="M39 45 C44 45, 46 59, 51 65" />
        <path d="M63 25 C70 25, 70 42, 77 45" />
        <path d="M63 65 C70 65, 70 48, 77 45" />
      </svg>
      {workflowNodes.map((node) => <div key={node.id} className={nodeClass(node.kind)} style={{ left: `${node.x}%`, top: `${node.y}%` }}><div className="workflow-node-index">{node.id === "receive" ? "01" : node.id === "classify" ? "02" : node.id === "review" ? "03" : node.id === "route" ? "04" : "05"}</div><div className="workflow-node-label">{node.label}</div><div className="workflow-node-sub">{node.sub}</div></div>)}
      <div className="workflow-legend"><span><i className="legend-dot ai" />AI / automatic</span><span><i className="legend-dot human" />Human decision</span><span><i className="legend-dot done" />Approved output</span></div>
    </div>
  );
}
