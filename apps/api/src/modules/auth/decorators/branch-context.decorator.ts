import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@vision-menu/types';

export interface BranchContext {
  chain_id: string;
  branch_id: string;
  branch_name: string;
  user: User;
}

export const BranchContext = createParamDecorator(
  (data: keyof BranchContext | undefined, ctx: ExecutionContext): BranchContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user?.branch_id) {
      throw new Error('User not associated with any branch');
    }

    const context: BranchContext = {
      chain_id: user.chain_id!,
      branch_id: user.branch_id!,
      branch_name: user.branch_name!,
      user,
    };

    return data ? context[data] : context;
  },
);