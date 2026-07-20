import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

@Controller('mcp')
export class McpController {
    constructor(private readonly mcpService: McpService) { }

    @Post()
    async handleMcpRequest(@Req() req: Request, @Res() res: Response) {
        const server = this.mcpService.createServer();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });

        res.on('close', () => {
            transport.close();
            server.close();
        })

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
}
