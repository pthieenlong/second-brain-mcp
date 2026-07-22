import * as path from 'path';
import { FlowGraph } from './flow.type';

/** Mermaid id không nhận ký tự lạ; chuẩn hoá về [A-Za-z0-9_]. */
function safeId(id: string): string {
    return id.replace(/[^A-Za-z0-9_]/g, '_');
}

/** Ngoặc kép trong label làm vỡ cú pháp Mermaid. */
function escapeLabel(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

export function toMermaid(graph: FlowGraph): string {
    const lines = ['```mermaid', 'flowchart TD'];

    for (const n of graph.nodes) {
        const label = n.filePath
            ? `${escapeLabel(n.label)}<br/><i>${path.basename(n.filePath, '.md')}</i>`
            : escapeLabel(n.text ? `${n.label}<br/>${n.text}` : n.label);
        lines.push(`    ${safeId(n.id)}["${label}"]`);
    }

    for (const e of graph.edges) {
        const arrow = e.label
            ? `-- "${escapeLabel(e.label)}" -->`
            : '-->';
        lines.push(`    ${safeId(e.from)} ${arrow} ${safeId(e.to)}`);
    }

    lines.push('```');
    return lines.join('\n');
}
