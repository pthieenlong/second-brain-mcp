import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { McpModule } from './mcp/mcp.module';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage/storage.service';
import { StorageModule } from './storage/storage.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { NoteIndexService } from './note-index/note-index.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), McpModule, StorageModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, StorageService, PrismaService, NoteIndexService],
})
export class AppModule { }
