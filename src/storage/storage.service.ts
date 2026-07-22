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
export const CANVAS_DIR = '08-Canvas';
export interface NoteInput {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

/** A note discovered on disk during a vault scan. */
export interface ScannedNote {
  title: string;
  category: string;
  tags: string[];
  filePath: string;
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

  async saveCanvas(title: string, json: string) {
    const slug = slugify(title);
    const filePath = path.join(this.vaultPath, CANVAS_DIR, `${slug}.canvas`);

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, json, 'utf-8')

    return filePath
  }

  get root(): string {
    return path.resolve(this.vaultPath);
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

  /**
   * Walks the vault and reads metadata from every .md file, so the index can be
   * rebuilt from the notes themselves — the vault is the source of truth.
   * Dot-directories are skipped (that is where .second-brain/index.db lives).
   */
  async scanVault(): Promise<ScannedNote[]> {
    const root = path.resolve(this.vaultPath);
    const found: ScannedNote[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          found.push(await this.readScannedNote(full, root));
        }
      }
    };

    await walk(root);
    return found;
  }

  private async readScannedNote(
    filePath: string,
    root: string,
  ): Promise<ScannedNote> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(raw);

    // Category comes from the folder the note sits in, falling back to the
    // frontmatter — the folder is what a user actually sees and moves.
    const relative = path.relative(root, filePath);
    const folder = path.dirname(relative).split(path.sep)[0];
    const category =
      folder && folder !== '.' ? folder : (frontmatter.category ?? INBOX);

    return {
      title: firstHeading(raw) ?? path.basename(filePath, '.md'),
      category,
      tags: frontmatter.tags ?? [],
      filePath,
    };
  }
}

interface Frontmatter {
  category?: string;
  tags?: string[];
}

/**
 * Reads the YAML block between the leading `---` fences. Deliberately minimal —
 * it only needs category and tags, and pulling in a YAML parser for that would
 * be more dependency than the job warrants.
 */
function parseFrontmatter(raw: string): Frontmatter {
  if (!raw.startsWith('---')) return {};
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return {};

  const lines = raw.slice(3, end).split('\n');
  const result: Frontmatter = {};
  let collectingTags = false;
  const tags: string[] = [];

  for (const line of lines) {
    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (collectingTags && listItem) {
      tags.push(listItem[1].trim());
      continue;
    }
    collectingTags = false;

    const pair = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, value] = pair;

    if (key === 'category') {
      result.category = value.trim();
    } else if (key === 'tags') {
      const inline = value.trim();
      if (inline.startsWith('[')) {
        // Inline form: tags: [a, b, c]
        tags.push(
          ...inline
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        );
      } else {
        // Block form: tags: followed by "  - value" lines
        collectingTags = true;
      }
    }
  }

  if (tags.length) result.tags = tags;
  return result;
}

/** The `# Title` line, which is what capture_note writes as the note title. */
function firstHeading(raw: string): string | null {
  const match = /^#\s+(.+)$/m.exec(raw);
  return match ? match[1].trim() : null;
}

function slugify(title: string): string {
  return (
    title.toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'untitled'
  )
}