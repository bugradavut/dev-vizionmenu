import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DatabaseService } from "@/config/database.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("supabase.serviceRoleKey") || configService.get<string>("jwt.secret"),
    });
  }

  async validate(payload: any) {
    try {
      // Supabase JWT payload structure
      const userId = payload.sub;
      
      if (!userId) {
        throw new UnauthorizedException("Invalid token payload");
      }

      const supabase = this.databaseService.getAdminClient();

      // Get user from Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser?.user) {
        throw new UnauthorizedException("User not found in auth system");
      }

      // Get user profile from our custom table (if exists)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get restaurant association (multi-tenant)
      const { data: restaurantUser } = await supabase
        .from("restaurant_users")
        .select(`
          *,
          restaurant:restaurants(*)
        `)
        .eq("user_id", userId)
        .single();

      return {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: profile?.full_name || authUser.user.user_metadata?.full_name,
        phone: profile?.phone || authUser.user.phone,
        avatar_url: profile?.avatar_url || authUser.user.user_metadata?.avatar_url,
        is_active: !authUser.user.banned_until,
        email_verified: authUser.user.email_confirmed_at != null,
        phone_verified: authUser.user.phone_confirmed_at != null,
        last_login_at: authUser.user.last_sign_in_at,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at,
        // Multi-tenant support
        restaurant_id: restaurantUser?.restaurant_id,
        role: restaurantUser?.role || 'guest',
        permissions: restaurantUser?.permissions || [],
        restaurant: restaurantUser?.restaurant,
      };
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException("Invalid token");
    }
  }
}
