import { SetMetadata } from "@nestjs/common";
import { BranchRole } from "@vision-menu/types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: BranchRole[]) =>
  SetMetadata(ROLES_KEY, roles);
