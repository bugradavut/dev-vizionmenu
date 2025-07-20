import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class CrossBranchGuard implements CanActivate {
  private readonly logger = new Logger(CrossBranchGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const query = request.query;

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

    // Chain owners can access all branches within their chain
    if (user.role === 'chain_owner') {
      this.logger.debug(`Chain owner ${user.id} accessing cross-branch resource`);
      return true;
    }

    // Check if user is trying to access a different branch
    const requestedBranchId = 
      params.branchId || 
      params.branch_id || 
      query.branchId || 
      query.branch_id ||
      request.body?.branch_id;
    
    if (requestedBranchId && requestedBranchId !== user.branch_id) {
      this.logger.warn(
        `Cross-branch access attempt: User ${user.id} (branch: ${user.branch_id}) ` +
        `tried to access branch ${requestedBranchId}`
      );
      
      throw new ForbiddenException({
        type: 'https://vizionmenu.com/errors/cross-branch-access-denied',
        title: 'Cross-Branch Access Denied',
        detail: `You can only access your assigned branch (${user.branch_id}). ` +
                `Requested branch: ${requestedBranchId}`,
      });
    }

    return true;
  }
}