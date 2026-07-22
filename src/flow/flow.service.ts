import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { FlowGraph } from './flow.type';
import { toMermaid } from './mermaid.writer';
import { toCanvas } from './canvas.writer';
export type FlowFormat = 'mermaid' | 'canvas';
export interface ExportResult {
    content: string;
    filePath?: string;
}

@Injectable()
export class FlowService {
    constructor(private readonly storage: StorageService) { }

    async export(graph: FlowGraph, format: FlowFormat): Promise<ExportResult> {
        if (format === 'mermaid') {
            return { content: toMermaid(graph) };
        }

        const json = toCanvas(graph, this.storage.root);
        const filePath = await this.storage.saveCanvas(graph.title, json);
        return { content: json, filePath }
    }
}
