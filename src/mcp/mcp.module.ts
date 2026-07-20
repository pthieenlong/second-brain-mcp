import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { StorageModule } from 'src/storage/storage.module';
import { NoteIndexModule } from 'src/note-index/note-index.module';

@Module({
  imports: [StorageModule, NoteIndexModule],
  providers: [McpService],
  controllers: [McpController]
})
export class McpModule { }
