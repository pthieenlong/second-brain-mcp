import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [McpService],
  controllers: [McpController]
})
export class McpModule { }
