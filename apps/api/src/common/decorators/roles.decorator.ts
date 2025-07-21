import { SetMetadata } from "@nestjs/common";
import { BranchRole } from "@/types/auth";

export const ROLES_KEY = "roles";
export const Roles = (...roles: BranchRole[]) =>
  SetMetadata(ROLES_KEY, roles);
