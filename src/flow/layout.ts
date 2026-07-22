import { FlowGraph, PositionedNode } from "./flow.type";

const NODE_W = 300;
const GAP_X = 60;
const GAP_Y = 100;

// Ước lượng chiều cao đủ chứa nội dung: Obsidian cắt chữ chứ không co node lại,
// nên thà thừa chỗ còn hơn mất chữ.
const LINE_H = 26;
const PADDING = 28;
const CHARS_PER_LINE = 32;
const MIN_H = 80;
// Node file render preview của cả note, không phải một dòng nhãn.
const FILE_H = 180;

function estimateHeight(label: string, text?: string, isFile?: boolean): number {
    if (isFile) return FILE_H;

    const wrap = (s: string) =>
        s
            .split('\n')
            .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);

    // Tiêu đề render dạng heading nên chiếm chỗ nhiều hơn một dòng thường.
    const lines = wrap(label) * 1.4 + (text ? wrap(text) : 0);
    return Math.max(MIN_H, Math.round(lines * LINE_H + PADDING));
}

export function layout(graph: FlowGraph): PositionedNode[] {
    const depth = new Map<string, number>();
    const incoming = new Map<string, number>();

    for (const n of graph.nodes) incoming.set(n.id, 0);
    for (const e of graph.edges) {
        incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
    }
    const queue = graph.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);

    for (const id of queue) depth.set(id, 0);

    while (queue.length) {
        const id = queue.shift()!;
        const d = depth.get(id)!;

        for (const e of graph.edges.filter((x) => x.from === id)) {
            if (depth.has(e.to)) continue;
            depth.set(e.to, d + 1);
            queue.push(e.to);
        }
    }

    const byDepth = new Map<number, string[]>();
    for (const n of graph.nodes) {
        const d = depth.get(n.id) ?? 0;
        if (!byDepth.has(d)) byDepth.set(d, []);
        byDepth.get(d)!.push(n.id)
    }

    const heights = new Map<string, number>();
    for (const n of graph.nodes) {
        heights.set(n.id, estimateHeight(n.label, n.text, Boolean(n.filePath)));
    }

    // Node trong cùng một tầng cao thấp khác nhau, nên y của tầng sau phải cộng
    // dồn theo node cao nhất của tầng trước thay vì nhân với hằng số.
    const position = new Map<string, { x: number; y: number }>();
    let y = 0;
    for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
        const ids = byDepth.get(d)!;
        const rowWidth = ids.length * NODE_W + (ids.length - 1) * GAP_X;
        ids.forEach((id, i) => {
            position.set(id, {
                x: Math.round(-rowWidth / 2 + i * (NODE_W + GAP_X)),
                y,
            });
        });
        y += Math.max(...ids.map((id) => heights.get(id)!)) + GAP_Y;
    }

    return graph.nodes.map((n) => ({
        ...n,
        ...position.get(n.id)!,
        width: NODE_W,
        height: heights.get(n.id)!
    }))
}
