import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RestaurantService } from "./restaurant.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard, CrossBranchGuard } from "../auth/guards";
import { RequireRole } from "../auth/decorators/require-role.decorator";
import { BranchContext } from "../auth/decorators/branch-context.decorator";
import { Branch, BranchStats } from "@/types/restaurant";

@ApiTags("restaurant")
@Controller("restaurant")
@UseGuards(JwtAuthGuard, RolesGuard, CrossBranchGuard)
@ApiBearerAuth()
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  @ApiOperation({ summary: "Get current branch details" })
  @ApiResponse({ status: 200, description: "Branch details" })
  async getBranch(@BranchContext('branch_id') branchId: string): Promise<Branch> {
    return this.restaurantService.getBranch(branchId);
  }

  @Patch()
  @RequireRole("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Update branch details" })
  @ApiResponse({ status: 200, description: "Branch updated successfully" })
  async updateBranch(
    @BranchContext('branch_id') branchId: string,
    @Body() updateBranchDto: Partial<Branch>,
  ): Promise<Branch> {
    return this.restaurantService.updateBranch(branchId, updateBranchDto);
  }

  @Get("stats")
  @RequireRole("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Get branch statistics" })
  @ApiResponse({ status: 200, description: "Branch statistics" })
  async getBranchStats(
    @BranchContext('branch_id') branchId: string,
  ): Promise<BranchStats> {
    return this.restaurantService.getBranchStats(branchId);
  }

  @Get("users")
  @RequireRole("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Get branch users" })
  @ApiResponse({ status: 200, description: "Branch users" })
  async getBranchUsers(@BranchContext('branch_id') branchId: string) {
    return this.restaurantService.getBranchUsers(branchId);
  }

  @Post("users/invite")
  @RequireRole("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Invite user to branch" })
  @ApiResponse({ status: 201, description: "User invited successfully" })
  async inviteUser(
    @BranchContext('branch_id') branchId: string,
    @Body() inviteDto: { email: string; role: string; permissions: string[] },
  ) {
    return this.restaurantService.inviteUserToBranch(branchId, inviteDto);
  }

  @Delete("users/:userId")
  @RequireRole("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Remove user from branch" })
  @ApiResponse({ status: 200, description: "User removed successfully" })
  async removeUser(
    @BranchContext('branch_id') branchId: string, 
    @Param("userId") userId: string
  ) {
    return this.restaurantService.removeUserFromBranch(branchId, userId);
  }
}
