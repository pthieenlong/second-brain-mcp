import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable } from '@nestjs/common';
import { NoteIndexService } from 'src/note-index/note-index.service';
import { INBOX, StorageService } from 'src/storage/storage.service';
import { z } from 'zod';
@Injectable()
export class McpService {
  private server: McpServer;
  constructor(
    private readonly storage: StorageService,
    private readonly noteIndex: NoteIndexService,
  ) {}

  createServer(): McpServer {
    const server = new McpServer({
      name: 'second-brain-mcp',
      version: '1.0.0',
    });
    server.registerTool(
      'capture_note',
      {
        title: 'Capture note',
        description:
          'Lưu một note vào second brain. AI cần tự phân loại category và tags dựa trên nội dung. ' +
          `Category hợp lệ: ${this.storage.categories.join(', ')}. ` +
          `Nếu không chắc category, để trống hoặc ghi ${INBOX}.`,
        inputSchema: {
          title: z.string().describe('Tiêu đề ngắn gọn cho note'),
          content: z.string().describe('Nội dung chính của note'),
          category: z.string().describe('Một trong các category hợp lệ'),
          tags: z.array(z.string()).describe('Danh sách tag liên quan'),
        },
      },
      async ({ title, content, category, tags }) => {
        try {
          const filePath = await this.storage.saveNote({
            title,
            content,
            category,
            tags,
          });
          await this.noteIndex.createNote({ title, category, tags, filePath });
          return {
            content: [{ type: 'text', text: `Note saved at ${filePath}` }],
          };
        } catch (error) {
          console.error('Failed to save note: ', error);
          return {
            content: [{ type: 'text', text: `Failed to save note: ${error}` }],
          };
        }
      },
    );
    server.registerTool(
      'search_notes',
      {
        title: 'Search notes',
        description:
          'Tìm kiếm note trong second brain theo từ khóa (tiêu đề), category và/hoặc tags. Trả về metadata (không có nội dung đầy đủ) — dùng get_note để đọc nội dung.',
        inputSchema: {
          keyword: z
            .string()
            .optional()
            .describe('Từ khóa tìm trong tiêu đề note'),
          category: z
            .string()
            .optional()
            .describe('Lọc theo category chính xác'),
          tags: z
            .array(z.string())
            .optional()
            .describe('Lọc theo tag (khớp bất kỳ tag nào trong danh sách)'),
          limit: z
            .number()
            .int()
            .positive()
            .max(100)
            .optional()
            .describe('Số lượng kết quả tối đa (mặc định 20)'),
        },
      },
      async ({ keyword, category, tags, limit }) => {
        try {
          const notes = await this.noteIndex.searchNotes({
            keyword,
            category,
            tags,
            limit,
          });
          if (notes.length === 0) {
            return {
              content: [
                { type: 'text', text: 'Không tìm thấy note nào phù hợp.' },
              ],
            };
          }
          const summary = notes
            .map(
              (n) =>
                `- [${n.id}] "${n.title}" (${n.category}, tags: ${n.tags.join(', ') || '-'}) — ${n.filePath}`,
            )
            .join('\n');
          return { content: [{ type: 'text', text: summary }] };
        } catch (error) {
          console.error('Failed to search notes: ', error);
          return {
            content: [
              { type: 'text', text: `Failed to search notes: ${error}` },
            ],
          };
        }
      },
    );

    server.registerTool(
      'get_note',
      {
        title: 'Get note',
        description:
          'Đọc nội dung đầy đủ của một note theo id (lấy từ kết quả search_notes).',
        inputSchema: {
          id: z.string().describe('id của note cần đọc'),
        },
      },
      async ({ id }) => {
        try {
          const note = await this.noteIndex.findById(id);
          if (!note) {
            return {
              content: [
                { type: 'text', text: `Không tìm thấy note với id ${id}` },
              ],
            };
          }
          const body = await this.storage.readNote(note.filePath);
          return { content: [{ type: 'text', text: body }] };
        } catch (error) {
          console.error('Failed to read note: ', error);
          return {
            content: [{ type: 'text', text: `Failed to read note: ${error}` }],
          };
        }
      },
    );

    server.registerTool(
      'update_note',
      {
        title: 'Update note',
        description:
          'Cập nhật một note đã có (theo id). Có thể đổi title, content, category, tags. Nếu title/category đổi, file sẽ được di chuyển sang vị trí mới trong vault.',
        inputSchema: {
          id: z.string().describe('id của note cần sửa'),
          title: z.string().describe('Tiêu đề mới cho note'),
          content: z.string().describe('Nội dung mới của note'),
          category: z.string().describe('Category mới'),
          tags: z.array(z.string()).describe('Danh sách tag mới'),
        },
      },
      async ({ id, title, content, category, tags }) => {
        try {
          const note = await this.noteIndex.findById(id);
          if (!note) {
            return {
              content: [
                { type: 'text', text: `Không tìm thấy note với id ${id}` },
              ],
            };
          }
          const newFilePath = await this.storage.updateNote(note.filePath, {
            title,
            content,
            category,
            tags,
          });
          await this.noteIndex.updateNote(id, {
            title,
            category,
            tags,
            filePath: newFilePath,
          });
          return {
            content: [{ type: 'text', text: `Note updated at ${newFilePath}` }],
          };
        } catch (error) {
          console.error('Failed to update note: ', error);
          return {
            content: [
              { type: 'text', text: `Failed to update note: ${error}` },
            ],
          };
        }
      },
    );

    server.registerTool(
      'delete_note',
      {
        title: 'Delete note',
        description:
          'Xóa một note khỏi second brain (theo id) — xóa cả file trong vault lẫn dữ liệu index.',
        inputSchema: {
          id: z.string().describe('id của note cần xóa'),
        },
      },
      async ({ id }) => {
        try {
          const note = await this.noteIndex.findById(id);
          if (!note) {
            return {
              content: [
                { type: 'text', text: `Không tìm thấy note với id ${id}` },
              ],
            };
          }
          await this.storage.deleteNote(note.filePath);
          await this.noteIndex.deleteNote(id);
          return {
            content: [{ type: 'text', text: `Note ${id} đã được xóa.` }],
          };
        } catch (error) {
          console.error('Failed to delete note: ', error);
          return {
            content: [
              { type: 'text', text: `Failed to delete note: ${error}` },
            ],
          };
        }
      },
    );

    // stderr, never stdout — stdout is the JSON-RPC channel.
    console.error('MCP Server initialized!');

    return server;
  }

  getServer(): McpServer {
    return this.server;
  }
}
