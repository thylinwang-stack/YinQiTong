import { Global, Module } from '@nestjs/common';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [PrismaService, AuthService, BearerAuthGuard, PermissionsGuard],
  exports: [AuthService, BearerAuthGuard, PermissionsGuard]
})
export class AuthModule {}
