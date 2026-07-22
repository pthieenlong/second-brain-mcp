import path from "path";
import { FlowGraph, PositionedNode } from "./flow.type";
import { layout } from "./layout";
interface CanvasNode {
    id: string;
    type: 'text' | 'file';
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    file?: string;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toNode: string;
    toSide: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
}

export function toCanvas(graph: FlowGraph, vaultRoot: string): string {
    const positioned = layout(graph);

    const nodes: CanvasNode[] = positioned.map((n: PositionedNode) => {
        // Chỉ lấy đúng field spec cho phép — spread cả node sẽ kéo theo
        // label/filePath, những thứ JSON Canvas không định nghĩa.
        const base = {
            id: n.id,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
        };
        if (n.filePath) {
            return {
                ...base,
                type: 'file' as const,
                file: path.relative(vaultRoot, n.filePath)
            }
        }

        return {
            ...base,
            type: 'text' as const,
            text: n.text ? `## ${n.label}\n\n${n.text}` : `## ${n.label}`
        }
    })

    const edges: CanvasEdge[] = graph.edges.map((e, i) => ({
        id: `edge-${i}`,
        fromNode: e.from,
        fromSide: 'bottom',
        toNode: e.to,
        toSide: 'top',
        ...(e.label ? { label: e.label } : {})
    }))

    return JSON.stringify({ nodes, edges }, null, 2)
}