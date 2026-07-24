import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs, readdirSync } from 'fs';
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

    // Try to scan vault directory dynamically for subdirectories starting with digits (e.g. 00-Inbox, 01-...)
    let categoriesList: string[] = [];
    try {
      const entries = readdirSync(this.vaultPath, { withFileTypes: true });
      categoriesList = entries
        .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
        .map((entry) => entry.name)
        .sort();
    } catch (e) {
      console.error('Failed to scan vault categories from disk:', e);
    }

    if (categoriesList.length > 0) {
      this.categories = categoriesList;
    } else {
      const configured = this.config
        .get<string>('NOTE_CATEGORIES')
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      this.categories = configured?.length ? configured : DEFAULT_CATEGORIES;
    }
  }

  private resolveCategory(category: string): string {
    if (!category) return INBOX;
    const normalized = category.replace(/\\/g, '/');
    const firstSegment = normalized.split('/')[0];
    if (this.categories.includes(firstSegment)) {
      return normalized;
    }
    return INBOX;
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
    const slug = removeVietnameseTones(title)
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
    const folder = path.dirname(relative).replace(/\\/g, '/');
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

function removeVietnameseTones(str: string): string {
  str = str.toLocaleLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  
  // Normalize and remove combining diacritical marks
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str;
}

function slugify(title: string): string {
  return (
    removeVietnameseTones(title)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'untitled'
  );
}