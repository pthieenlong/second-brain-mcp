import { Module } from '@nestjs/common';
import { NoteIndexService } from './note-index.service';

@Module({
  providers: [NoteIndexService],
  exports: [NoteIndexService],
})
export class NoteIndexModule {}
