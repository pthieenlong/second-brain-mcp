import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface IndexedNote {
  title: string;
  category: string;
  tags: string[];
  filePath: string;
}

export interface SearchNotesQuery {
  keyword?: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface NoteRecord {
  id: string;
  title: string;
  category: string;
  tags: string[];
  filePath: string;
  createdAt: Date;
}

const TAG_SEP = ',';

/**
 * SQLite has no array type, so tags live in a single column wrapped in
 * separators (",react,hooks,"). The wrapping matters: searching for ",react,"
 * then matches whole tags only, never the "react" inside "react-native".
 */
function serializeTags(tags: string[]): string {
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  return clean.length ? `${TAG_SEP}${clean.join(TAG_SEP)}${TAG_SEP}` : '';
}

function deserializeTags(tag: string): string[] {
  return tag.split(TAG_SEP).filter(Boolean);
}

function toNoteRecord(row: {
  id: string;
  title: string;
  category: string;
  tag: string;
  filePath: string;
  createdAt: Date;
}): NoteRecord {
  const { tag, ...rest } = row;
  return { ...rest, tags: deserializeTags(tag) };
}

@Injectable()
export class NoteIndexService {
  constructor(private readonly prisma: PrismaService) {}

  async createNote(data: IndexedNote): Promise<NoteRecord> {
    try {
      const row = await this.prisma.note.create({
        data: {
          title: data.title,
          category: data.category,
          tag: serializeTags(data.tags),
          filePath: data.filePath,
        },
      });
      return toNoteRecord(row);
    } catch (error) {
      console.error('Failed to save note to database: ', error);
      throw error;
    }
  }

  async searchNotes(query: SearchNotesQuery): Promise<NoteRecord[]> {
    const tagFilters = (query.tags ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ tag: { contains: `${TAG_SEP}${t}${TAG_SEP}` } }));

    const rows = await this.prisma.note.findMany({
      where: {
        // SQLite's LIKE is already case-insensitive for ASCII, so no
        // `mode` here — that option is PostgreSQL-only.
        ...(query.keyword ? { title: { contains: query.keyword } } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(tagFilters.length ? { OR: tagFilters } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
    });
    return rows.map(toNoteRecord);
  }

  async findById(id: string): Promise<NoteRecord | null> {
    const row = await this.prisma.note.findUnique({ where: { id } });
    return row ? toNoteRecord(row) : null;
  }

  async updateNote(id: string, data: IndexedNote): Promise<NoteRecord> {
    try {
      const row = await this.prisma.note.update({
        where: { id },
        data: {
          title: data.title,
          category: data.category,
          tag: serializeTags(data.tags),
          filePath: data.filePath,
        },
      });
      return toNoteRecord(row);
    } catch (error) {
      console.error('Failed to update note in database: ', error);
      throw error;
    }
  }

  async deleteNote(id: string): Promise<NoteRecord> {
    try {
      const row = await this.prisma.note.delete({ where: { id } });
      return toNoteRecord(row);
    } catch (error) {
      console.error('Failed to delete note from database: ', error);
      throw error;
    }
  }
}
