import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class DatabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    // Regular client for user operations
    this.supabase = createClient(
      this.configService.get<string>("supabase.url"),
      this.configService.get<string>("supabase.anonKey"),
    );

    // Admin client for server-side operations
    this.supabaseAdmin = createClient(
      this.configService.get<string>("supabase.url"),
      this.configService.get<string>("supabase.serviceRoleKey"),
    );
  }

  // Get regular client (for user operations)
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Get admin client (for server-side operations)
  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }

  // Set auth token for user operations
  setAuthToken(token: string): SupabaseClient {
    return createClient(
      this.configService.get<string>("supabase.url"),
      this.configService.get<string>("supabase.anonKey"),
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );
  }

  // Helper method to get user's Supabase client
  getUserClient(authToken: string): SupabaseClient {
    return this.setAuthToken(authToken);
  }
}
