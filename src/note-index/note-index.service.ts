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

@Injectable()
export class NoteIndexService {
    constructor(private readonly prisma: PrismaService) { }

    async createNote(data: IndexedNote) {
        try {
            return await this.prisma.note.create({
                data: {
                    title: data.title,
                    category: data.category,
                    tag: data.tags,
                    filePath: data.filePath,
                }
            })
        } catch (error) {
            console.error("Failed to save note to database: ", error)
            throw error
        }
    }

    async searchNotes(query: SearchNotesQuery) {
        return this.prisma.note.findMany({
            where: {
                ...(query.keyword ? { title: { contains: query.keyword, mode: 'insensitive' } } : {}),
                ...(query.category ? { category: query.category } : {}),
                ...(query.tags && query.tags.length > 0 ? { tag: { hasSome: query.tags } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: query.limit ?? 20,
        })
    }

    async findById(id: string) {
        return this.prisma.note.findUnique({ where: { id } })
    }

    async updateNote(id: string, data: IndexedNote) {
        try {
            return await this.prisma.note.update({
                where: { id },
                data: {
                    title: data.title,
                    category: data.category,
                    tag: data.tags,
                    filePath: data.filePath,
                }
            })
        } catch (error) {
            console.error("Failed to update note in database: ", error)
            throw error
        }
    }

    async deleteNote(id: string) {
        try {
            return await this.prisma.note.delete({ where: { id } })
        } catch (error) {
            console.error("Failed to delete note from database: ", error)
            throw error
        }
    }
}
