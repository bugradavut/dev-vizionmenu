import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BranchRole } from '../../types';
import { ROLES_KEY } from '../decorators/require-role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<BranchRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/unauthorized',
        title: 'Unauthorized',
        detail: 'User not authenticated',
      });
    }

    if (!user.branch_id) {
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'User not associated with any branch',
      });
    }

    if (!user.role) {
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'User role not defined',
      });
    }

    // Chain owner has all permissions across all branches
    if (user.role === 'chain_owner') {
      this.logger.debug(`Chain owner ${user.id} granted access to protected resource`);
      return true;
    }

    // Check if user has required role
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `Role access denied: User ${user.id} with role ${user.role} ` +
        `tried to access resource requiring roles: ${requiredRoles.join(', ')}`
      );
      
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/insufficient-role',
        title: 'Insufficient Role',
        detail: `Required role: ${requiredRoles.join(', ')}. Current role: ${user.role}`,
      });
    }

    this.logger.debug(`Role access granted: User ${user.id} with role ${user.role}`);
    return true;
  }
}