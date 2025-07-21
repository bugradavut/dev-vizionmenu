import { SetMetadata } from '@nestjs/common';
import { BranchRole } from '../../../types';

export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: BranchRole[]) => SetMetadata(ROLES_KEY, roles);