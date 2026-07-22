import { Module } from '@nestjs/common';
import { StorageModule } from 'src/storage/storage.module';
import { FlowService } from './flow.service';

@Module({
    imports: [StorageModule],
    providers: [FlowService],
    exports: [FlowService]
})
export class FlowModule { }
