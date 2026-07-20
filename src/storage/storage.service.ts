import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

const DEFAULT_CATEGORIES = [
  '01-Fundamentals',
  '02-Work',
  '03-Product-Thinking',
  '04-Learning',
  '05-Career',
  '06-Personal',
  '07-Projects',
];

export const INBOX = '00-Inbox';

export interface NoteInput {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

@Injectable()
export class StorageService {
  private readonly vaultPath: string;
  readonly categories: string[];

  constructor(private readonly config: ConfigService) {
    this.vaultPath = this.config.get<string>('VAULT_PATH') || '';

    if (!this.vaultPath) {
      throw new Error('VAULT_PATH is not defined');
    }

    const configured = this.config
      .get<string>('NOTE_CATEGORIES')
      ?.split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    this.categories = configured?.length ? configured : DEFAULT_CATEGORIES;
  }

  private resolveCategory(category: string): string {
    return this.categories.includes(category) ? category : INBOX;
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

  private buildFilePath(title: string, actualCategory: string): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = title
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const fileName = `${date}-${slug || 'untitled'}.md`;
    return path.join(this.vaultPath, actualCategory, fileName);
  }

  private resolveInVault(filePath: string): string {
    const resolved = path.resolve(filePath);
    const vaultRoot = path.resolve(this.vaultPath);
    if (!resolved.startsWith(vaultRoot + path.sep)) {
      throw new Error('Invalid file path: outside of vault');
    }
    return resolved;
  }

  async saveNote(input: NoteInput): Promise<string> {
    const actualCategory = this.resolveCategory(input.category);
    const filePath = this.buildFilePath(input.title, actualCategory);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const body = `${this.buildFrontmatter(input, actualCategory)}# ${input.title}\n\n${input.content}\n`;
    await fs.writeFile(filePath, body, 'utf-8');
    return filePath;
  }

  async readNote(filePath: string): Promise<string> {
    const resolved = this.resolveInVault(filePath);
    return fs.readFile(resolved, 'utf-8');
  }

  async updateNote(oldFilePath: string, input: NoteInput): Promise<string> {
    const oldResolved = this.resolveInVault(oldFilePath);
    const actualCategory = this.resolveCategory(input.category);
    const newFilePath = this.buildFilePath(input.title, actualCategory);
    await fs.mkdir(path.dirname(newFilePath), { recursive: true });

    const body = `${this.buildFrontmatter(input, actualCategory)}# ${input.title}\n\n${input.content}\n`;
    await fs.writeFile(newFilePath, body, 'utf-8');

    if (newFilePath !== oldResolved) {
      await fs.unlink(oldResolved);
    }
    return newFilePath;
  }

  async deleteNote(filePath: string): Promise<void> {
    const resolved = this.resolveInVault(filePath);
    await fs.unlink(resolved);
  }
}
