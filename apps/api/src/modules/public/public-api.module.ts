import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicApiController],
  providers: [PrismaService, PublicApiService],
  exports: [PublicApiService]
})
export class PublicApiModule {}
