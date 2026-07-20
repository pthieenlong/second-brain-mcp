import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './mcp/mcp.module';
import { StorageModule } from './storage/storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { NoteIndexModule } from './note-index/note-index.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    McpModule,
    StorageModule,
    PrismaModule,
    NoteIndexModule,
  ],
})
export class AppModule {}
