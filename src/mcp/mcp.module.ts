import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { StorageModule } from 'src/storage/storage.module';
import { NoteIndexModule } from 'src/note-index/note-index.module';
import { FlowModule } from 'src/flow/flow.module';

@Module({
  imports: [StorageModule, NoteIndexModule, FlowModule],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
