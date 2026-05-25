import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_KEY = 'allow_anonymous';
export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
