import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { z } from 'zod'
@Injectable()
export class McpService {
    private server: McpServer;
    constructor(private readonly storage: StorageService) { }

    createServer(): McpServer {
        const server = new McpServer({
            name: 'second-brain-mcp',
            version: '1.0.0'
        })
        server.registerTool(
            'capture_note',
            {
                title: 'Capture note',
                description: 'Lưu một note vào second brain. AI cần tự phân loại category và tags dựa trên nội dung. ' +
                    'Category hợp lệ: 01-Fundamentals, 02-Odoo-Job, 03-Product-Thinking, 04-English, 05-Career-Domain, 06-Personal, 07-Projects. ' +
                    'Nếu không chắc category, để trống hoặc ghi 00-Inbox.',
                inputSchema: {
                    title: z.string().describe('Tiêu đề ngắn gọn cho note'),
                    content: z.string().describe('Nội dung chính của note'),
                    category: z.string().describe('Một trong các category hợp lệ'),
                    tags: z.array(z.string()).describe('Danh sách tag liên quan'),
                },
            },
            async ({ title, content, category, tags }) => {
                const filePath = await this.storage.saveNote({
                    title, content, category, tags
                })
                return {
                    content: [{ type: 'text', text: `Note saved at ${filePath}` }]
                }
            }
        )
        console.log("MCP Server initialized!");

        return server;
    }

    getServer(): McpServer {
        return this.server;
    }

}
