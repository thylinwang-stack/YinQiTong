import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_ANONYMOUS_KEY, REQUIRED_PERMISSIONS_KEY } from './rbac.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowAnonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (allowAnonymous) return true;

    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]) || [];
    if (!required.length) return true;

    const request = context.switchToHttp().getRequest();
    const permissions = new Set<string>(request.auth?.permissions || []);
    if (permissions.has('*') || required.every(permission => permissions.has(permission))) {
      return true;
    }

    throw new ForbiddenException({
      code: 'RBAC_FORBIDDEN',
      message: '当前账号没有执行该操作的权限',
      required
    });
  }
}
