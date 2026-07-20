import { Test, TestingModule } from '@nestjs/testing';
import { NoteIndexService } from './note-index.service';

describe('NoteIndexService', () => {
  let service: NoteIndexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoteIndexService],
    }).compile();

    service = module.get<NoteIndexService>(NoteIndexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
