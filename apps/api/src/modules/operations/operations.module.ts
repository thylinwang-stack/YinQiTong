import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  controllers: [OperationsController],
  providers: [PrismaService, OperationsService],
  exports: [OperationsService]
})
export class OperationsModule {}
