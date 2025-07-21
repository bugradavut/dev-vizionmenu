import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DatabaseService } from "@/config/database.service";
import { User, AuthTokenPayload } from "../../../types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: "or/5hRDTnnaMIMEtgHVxOSB/HUvvB9qazVSKGTtlDSCGGzQoVIZ/IA5lbfuZTyYdM+TCuKeib11cckjlw1yYCw==",
    });
  }

  async validate(payload: AuthTokenPayload): Promise<User> {
    try {
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

      // Get user profile from our custom table
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get multi-branch user info using our helper function
      const { data: branchInfo, error: branchError } = await supabase
        .rpc('get_user_branch_info', { user_id: userId });

      if (branchError) {
        throw new UnauthorizedException("Error getting user branch information");
      }

      if (!branchInfo || !branchInfo.branch_id) {
        throw new UnauthorizedException("User not associated with any branch");
      }

      // Note: Supabase tokens don't include branch_id/role claims by default
      // We get this info from database instead of validating against token

      return {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: profile?.full_name || authUser.user.user_metadata?.full_name,
        phone: profile?.phone || authUser.user.phone,
        avatar_url: profile?.avatar_url || authUser.user.user_metadata?.avatar_url,
        is_active: true,
        email_verified: authUser.user.email_confirmed_at != null,
        phone_verified: authUser.user.phone_confirmed_at != null,
        last_login_at: authUser.user.last_sign_in_at,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at,
        // Multi-branch support
        chain_id: branchInfo.chain_id,
        branch_id: branchInfo.branch_id,
        branch_name: branchInfo.branch_name,
        role: branchInfo.role,
        permissions: branchInfo.permissions || [],
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
