import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssistantsController } from './assistants.controller';
import { AssistantsService } from './assistants.service';

@Module({
  controllers: [AssistantsController],
  providers: [PrismaService, AssistantsService],
  exports: [AssistantsService]
})
export class AssistantsModule {}
