import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../types';

export interface ChainContext {
  chain_id: string;
  user: User;
  available_branches?: string[]; // branch_ids user has access to
}

export const ChainContext = createParamDecorator(
  (data: keyof ChainContext | undefined, ctx: ExecutionContext): ChainContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user?.chain_id) {
      throw new Error('User not associated with any chain');
    }

    const context: ChainContext = {
      chain_id: user.chain_id!,
      user,
      // For chain_owner, they have access to all branches
      // For others, only their current branch
      available_branches: user.role === 'chain_owner' ? undefined : [user.branch_id!],
    };

    return data ? context[data] : context;
  },
);