import { SetMetadata } from "@nestjs/common";
import { RestaurantRole } from "@vision-menu/types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: RestaurantRole[]) =>
  SetMetadata(ROLES_KEY, roles);
