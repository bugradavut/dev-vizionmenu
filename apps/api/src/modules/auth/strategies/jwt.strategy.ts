import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DatabaseService } from "@/config/database.service";
import { AuthTokenPayload } from "@vision-menu/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("jwt.secret"),
    });
  }

  async validate(payload: AuthTokenPayload) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user details
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", payload.sub)
        .single();

      if (userError || !user || !user.is_active) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Get restaurant association
      const { data: restaurantUser, error: restaurantError } = await supabase
        .from("restaurant_users")
        .select(
          `
          *,
          restaurant:restaurants(*)
        `,
        )
        .eq("user_id", payload.sub)
        .eq("restaurant_id", payload.restaurant_id)
        .single();

      if (restaurantError || !restaurantUser) {
        throw new UnauthorizedException("Restaurant association not found");
      }

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        restaurant_id: restaurantUser.restaurant_id,
        role: restaurantUser.role,
        permissions: restaurantUser.permissions,
        restaurant: restaurantUser.restaurant,
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
