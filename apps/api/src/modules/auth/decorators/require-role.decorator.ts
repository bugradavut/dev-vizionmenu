import { SetMetadata } from '@nestjs/common';
import { BranchRole } from '@vision-menu/types';

export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: BranchRole[]) => SetMetadata(ROLES_KEY, roles);