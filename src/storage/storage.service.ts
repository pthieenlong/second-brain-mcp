import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

const VALID_CATEGORIES = [
    '00-Inbox',
    '01-Fundamentals',
    '02-Odoo-Job',
    '03-Product-Thinking',
    '04-English',
    '05-Career-Domain',
    '06-Personal',
    '07-Projects'
]

const INBOX = '00-Inbox'

export interface NoteInput {
    title: string;
    content: string;
    category: string;
    tags: string[];
}

@Injectable()
export class StorageService {
    private readonly vaultPath: string;

    constructor(private readonly config: ConfigService) {
        this.vaultPath = this.config.get<string>('VAULT_PATH') || '';

        if (!this.vaultPath) {
            throw new Error('VAULT_PATH is not defined');
        }
    }

    private resolveCategory(category: string): string {
        return VALID_CATEGORIES.includes(category) ? category : INBOX
    }

    private buildFrontmatter(input: NoteInput, actualCategory: string): string {
        const date = new Date().toISOString().split('T')[0];
        const tagsYaml = input.tags.map((t) => `  - ${t}`).join('\n');

        return [
            '---',
            `date: ${date}`,
            `category: ${actualCategory}`,
            'tags:',
            tagsYaml,
            `source: chat-capture`,
            '---',
            '',
        ].join('\n');
    }

    async saveNote(input: NoteInput): Promise<string> {
        const actualCategory = this.resolveCategory(input.category);
        const date = new Date().toISOString().split('T')[0];
        const slug = input.title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '').slice(0, 50)
        const fileName = `${date}-${slug || 'untitled'}.md`;
        const dir = path.join(this.vaultPath, actualCategory);
        await fs.mkdir(dir, { recursive: true });

        const filePath = path.join(dir, fileName);
        const body = `${this.buildFrontmatter(input, actualCategory)}# ${input.title}\n\n${input.content}\n`;

        await fs.writeFile(filePath, body, 'utf-8');
        return filePath;
    }

    async readNote(filePath: string): Promise<string> {
        const resolved = path.resolve(filePath);
        const vaultRoot = path.resolve(this.vaultPath);
        if (!resolved.startsWith(vaultRoot + path.sep)) {
            throw new Error('Invalid file path: outside of vault');
        }
        return fs.readFile(resolved, 'utf-8');
    }
}
