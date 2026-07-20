#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { applyMigrations } from './prisma/migrate';

async function bootstrap() {
  // stdout carries the JSON-RPC stream — anything else written there corrupts
  // the protocol and the client drops the connection. Logs go to stderr only.
  await applyMigrations();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  app.enableShutdownHooks();

  const server = app.get(McpService).createServer();
  await server.connect(new StdioServerTransport());
}

bootstrap().catch((error) => {
  console.error('Failed to start second-brain-mcp:', error);
  process.exit(1);
});
