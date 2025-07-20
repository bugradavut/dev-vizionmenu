Phase 1: Database Setup (1-2 saat)
1. Supabase trigger oluştur (auth.users → public.users sync)
2. RLS politikaları yaz (users, roles tabloları)
3. Role seed data'sı hazırla
4. Test user'ları oluştur
Phase 2: Backend Implementation (3-4 saat)
1. Auth Module
   * JWT strategy configuration
   * Custom claims decorator
   * Restaurant context middleware
2. Users Module
   * Create user endpoint
   * Update user endpoint
   * List users endpoint (restaurant scoped)
   * Assign role endpoint
3. Guards & Decorators
   * RoleGuard implementation
   * @RequireRole() decorator
   * @CurrentUser() decorator
Phase 3: Frontend Implementation (3-4 saat)
1. User Management Page
   * User list with DataTable
   * Create user modal
   * Edit user modal
   * Role assignment dropdown
2. Auth Context Enhancement
   * User role state management
   * Permission check utilities
   * Protected route wrapper
3. UI Permission Control
   * Conditional rendering based on roles
   * Disabled states for unauthorized actions
   * Permission-based menu items
Phase 4: Testing & Security (2-3 saat)
1. Role-based access testing
2. Cross-tenant security testing
3. Token refresh flow testing
4. Error handling improvements
Burayı çok güzel açıklamışsın. Aynısını detaylı olarak aşağıdaki requiments için de yapar mısın? Bu şekilde yapay zeka daha iyi anlar. Sadece text olarak yaz

Requirements:
1. Sync Supabase auth.users with public.users table via trigger
2. Add restaurant_id and role to JWT claims
3. Implement RLS policies for multi-tenant isolation
4. Create NestJS endpoints for user CRUD with restaurant scoping
5. Build role-based guards and decorators
6. Create React components for user management
7. Ensure no cross-tenant data leakage