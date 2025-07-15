import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { DatabaseService } from "@/config/database.service";
import {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  LoginResponse,
  RegisterResponse,
  User,
  AuthTokenPayload,
} from "@vision-menu/types";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async login(loginDto: LoginRequest): Promise<LoginResponse> {
    const { email, password, restaurant_slug } = loginDto;

    try {
      // Get admin client for server-side operations
      const supabase = this.databaseService.getAdminClient();

      // Get user by email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Get user's restaurant association
      let restaurantQuery = supabase
        .from("restaurant_users")
        .select(
          `
          *,
          restaurant:restaurants(id, name, slug)
        `,
        )
        .eq("user_id", user.id);

      // Filter by restaurant slug if provided
      if (restaurant_slug) {
        restaurantQuery = restaurantQuery.eq(
          "restaurant.slug",
          restaurant_slug,
        );
      }

      const { data: restaurantUsers, error: restaurantError } =
        await restaurantQuery;

      if (restaurantError || !restaurantUsers?.length) {
        throw new UnauthorizedException(
          "User not associated with any restaurant",
        );
      }

      // If multiple restaurants, take the first one or the one matching the slug
      const restaurantUser = restaurantUsers[0];

      // Generate JWT token
      const payload: AuthTokenPayload = {
        sub: user.id,
        email: user.email,
        restaurant_id: restaurantUser.restaurant_id,
        role: restaurantUser.role,
        permissions: restaurantUser.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(
        { sub: user.id, type: "refresh" },
        { expiresIn: this.configService.get("jwt.refreshExpiresIn") },
      );

      // Update last login
      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      return {
        user: {
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
        },
        session: {
          user: {
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
          },
          restaurant_id: restaurantUser.restaurant_id,
          role: restaurantUser.role,
          permissions: restaurantUser.permissions,
          access_token,
          refresh_token,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        restaurant: {
          id: restaurantUser.restaurant.id,
          name: restaurantUser.restaurant.name,
          slug: restaurantUser.restaurant.slug,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException("Login failed");
    }
  }

  async register(registerDto: RegisterRequest): Promise<RegisterResponse> {
    const {
      email,
      password,
      full_name,
      phone,
      restaurant_name,
      restaurant_slug,
    } = registerDto;

    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        throw new BadRequestException("User already exists");
      }

      // Check if restaurant slug is taken
      const { data: existingRestaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", restaurant_slug)
        .single();

      if (existingRestaurant) {
        throw new BadRequestException("Restaurant slug is already taken");
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          email,
          password_hash,
          full_name,
          phone,
          is_active: true,
          email_verified: false,
          phone_verified: false,
        })
        .select()
        .single();

      if (userError) {
        throw new BadRequestException("Failed to create user");
      }

      // Create restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          name: restaurant_name,
          slug: restaurant_slug,
          settings: {
            currency: "USD",
            tax_rate: 0.1,
            service_fee: 0.0,
            min_order_amount: 0,
            max_delivery_distance: 10,
            delivery_fee: 2.99,
            pickup_enabled: true,
            delivery_enabled: true,
            table_service_enabled: true,
            qr_ordering_enabled: true,
            online_payments_enabled: true,
            third_party_integration_enabled: false,
          },
        })
        .select()
        .single();

      if (restaurantError) {
        throw new BadRequestException("Failed to create restaurant");
      }

      // Associate user with restaurant as owner
      const { error: associationError } = await supabase
        .from("restaurant_users")
        .insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          role: "owner",
          permissions: ["*"],
        });

      if (associationError) {
        throw new BadRequestException(
          "Failed to associate user with restaurant",
        );
      }

      return {
        user: {
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
        },
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        },
        verification_required: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Registration failed");
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordRequest,
  ): Promise<{ message: string }> {
    // Implementation for password reset email
    // This would typically send an email with reset link
    return { message: "Password reset email sent" };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordRequest,
  ): Promise<{ message: string }> {
    // Implementation for password reset
    // This would verify the token and update the password
    return { message: "Password reset successfully" };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordRequest,
  ): Promise<{ message: string }> {
    const { current_password, new_password } = changePasswordDto;

    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        throw new BadRequestException("User not found");
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        current_password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        throw new BadRequestException("Current password is incorrect");
      }

      // Hash new password
      const new_password_hash = await bcrypt.hash(new_password, 10);

      // Update password
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: new_password_hash })
        .eq("id", userId);

      if (updateError) {
        throw new BadRequestException("Failed to update password");
      }

      return { message: "Password changed successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to change password");
    }
  }

  async getProfile(userId: string): Promise<User> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new BadRequestException("User not found");
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
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get profile");
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Implementation for logout
    // This could invalidate tokens or update last activity
    return { message: "Logged out successfully" };
  }

  async refreshToken(userId: string): Promise<{ access_token: string }> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user and restaurant association
      const { data: restaurantUser, error } = await supabase
        .from("restaurant_users")
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .eq("user_id", userId)
        .single();

      if (error || !restaurantUser) {
        throw new UnauthorizedException("User not found");
      }

      // Generate new JWT token
      const payload: AuthTokenPayload = {
        sub: restaurantUser.user.id,
        email: restaurantUser.user.email,
        restaurant_id: restaurantUser.restaurant_id,
        role: restaurantUser.role,
        permissions: restaurantUser.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      const access_token = this.jwtService.sign(payload);

      return { access_token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException("Failed to refresh token");
    }
  }
}
