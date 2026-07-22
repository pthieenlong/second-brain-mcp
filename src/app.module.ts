import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './mcp/mcp.module';
import { StorageModule } from './storage/storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { NoteIndexModule } from './note-index/note-index.module';
import { FlowService } from './flow/flow.service';
import { FlowModule } from './flow/flow.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    McpModule,
    StorageModule,
    PrismaModule,
    NoteIndexModule,
    FlowModule,
  ],
  providers: [FlowService],
})
export class AppModule {}
