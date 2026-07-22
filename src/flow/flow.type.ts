export interface FlowNode {
    id: string;
    label: string;
    filePath?: string;
    text?: string;
}

export interface FlowEdge {
    from: string;
    to: string;
    label?: string;
}

export interface FlowGraph {
    title: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface PositionedNode extends FlowNode {
    x: number;
    y: number;
    width: number;
    height: number;
}