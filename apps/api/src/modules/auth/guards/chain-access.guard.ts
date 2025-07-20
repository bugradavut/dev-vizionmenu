import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export const CHAIN_ACCESS_KEY = 'chainAccess';
export const RequireChainAccess = () => SetMetadata(CHAIN_ACCESS_KEY, true);

@Injectable()
export class ChainAccessGuard implements CanActivate {
  private readonly logger = new Logger(ChainAccessGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireChainAccess = this.reflector.getAllAndOverride<boolean>(
      CHAIN_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireChainAccess) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/unauthorized',
        title: 'Unauthorized',
        detail: 'User not authenticated',
      });
    }

    if (!user.chain_id) {
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'User not associated with any chain',
      });
    }

    // Only chain owners can access chain-level resources
    if (user.role !== 'chain_owner') {
      this.logger.warn(
        `Chain access denied: User ${user.id} with role ${user.role} ` +
        `tried to access chain-level resource`
      );
      
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/insufficient-permissions',
        title: 'Insufficient Permissions',
        detail: 'Only chain owners can access chain-level resources',
      });
    }

    // Verify user is accessing their own chain
    const requestedChainId = params.chainId || params.chain_id;
    
    if (requestedChainId && requestedChainId !== user.chain_id) {
      this.logger.warn(
        `Cross-chain access attempt: User ${user.id} (chain: ${user.chain_id}) ` +
        `tried to access chain ${requestedChainId}`
      );
      
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/cross-chain-access-denied',
        title: 'Cross-Chain Access Denied',
        detail: `You can only access your own chain (${user.chain_id}). ` +
                `Requested chain: ${requestedChainId}`,
      });
    }

    this.logger.debug(`Chain access granted: User ${user.id} accessing chain ${user.chain_id}`);
    return true;
  }
}