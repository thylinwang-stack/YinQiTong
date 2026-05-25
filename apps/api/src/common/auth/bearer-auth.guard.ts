import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@/modules/auth/auth.service';
import { ALLOW_ANONYMOUS_KEY } from './rbac.decorators';

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowAnonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (allowAnonymous) return true;

    const request = context.switchToHttp().getRequest();
    const user = await this.authService.getUserFromAuthorization(request.headers.authorization);
    request.user = user;
    request.auth = this.authService.toUserProfile(user);
    return true;
  }
}
