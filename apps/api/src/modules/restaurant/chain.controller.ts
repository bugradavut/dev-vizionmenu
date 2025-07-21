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
import { RolesGuard, ChainAccessGuard } from "../auth/guards";
import { RequireRole } from "../auth/decorators/require-role.decorator";
import { RequireChainAccess } from "../auth/guards/chain-access.guard";
import { ChainContext } from "../auth/decorators/chain-context.decorator";
import { RestaurantChain } from "@/types/restaurant";

@ApiTags("chain")
@Controller("chain")
@UseGuards(JwtAuthGuard, RolesGuard, ChainAccessGuard)
@ApiBearerAuth()
export class ChainController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get(":chainId/info")
  @RequireRole("chain_owner")
  @RequireChainAccess()
  @ApiOperation({ summary: "Get chain info (chain_owner only)" })
  @ApiResponse({ status: 200, description: "Chain info" })
  async getChainInfo(
    @Param("chainId") chainId: string,
    @ChainContext() chainContext: any,
  ) {
    // Example endpoint to demonstrate ChainAccessGuard
    return {
      chain_id: chainId,
      message: "Chain access granted",
      user_role: chainContext.user.role,
      accessible_branches: chainContext.available_branches || "all",
    };
  }
}