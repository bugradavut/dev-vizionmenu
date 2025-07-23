# Multi-Branch User Management Implementation Plan

- [x] 1. Multi-Branch Database Schema Setup




  - restaurant_chains tablosu oluştur
  - branches tablosu oluştur  
  - branch_users tablosu oluştur (restaurant_users'ı değiştir)
  - Multi-branch JWT claims function oluştur
  - Auth trigger function ekle (auth.users → user_profiles sync)
  - Branch-based RLS politikaları oluştur
  - Test chain'ler, branch'ler ve user'lar oluştur
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. NestJS Multi-Branch Auth Module




  - JWT strategy'yi chain_id, branch_id ve role claims ile genişlet
  - Multi-branch JwtPayload interface tanımla
  - @CurrentUser() decorator oluştur
  - @BranchContext() decorator oluştur
  - @ChainContext() decorator oluştur
  - Branch switching logic implement et
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.6_

- [x] 3. Multi-Branch Role-Based Guards



  - @RequireRole() decorator implement et (chain_owner, branch_manager, etc.)
  - Multi-branch RolesGuard oluştur ve test et
  - AllExceptionsFilter ile RFC 7807 error handling ekle
  - Cross-branch access prevention guard oluştur
  - Chain owner multi-branch access guard oluştur
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2_

- [x] 4. Users Module CRUD Implementation


- [x] 4.1 Users Service ve Entity Oluştur


  - User entity interface tanımla
  - UsersService ile Supabase connection kur
  - Restaurant-scoped user queries implement et
  - _Requirements: 2.1, 2.2, 5.1_

- [x] 4.2 Multi-Branch Users Controller ve DTO'lar

  **Dual Backend Implementation:**
  - **NestJS (Local)**: Full modular implementation with DTOs and guards
  - **Express (Production)**: Serverless functions with identical API contract
  - GET /api/v1/users/branch/:branchId endpoint (branch-scoped) ✅ Both backends
  - POST /api/v1/users endpoint (create user) ✅ Both backends  
  - PATCH /api/v1/users/:userId/branch/:branchId endpoint (update user) ✅ Both backends
  - DELETE /api/v1/users/:userId/branch/:branchId endpoint (delete user) ✅ Both backends
  - POST /api/v1/users/:userId/branch/:branchId/assign-role (role assignment) ⏳ Express pending
  - CreateUserDto, UpdateUserDto, AssignRoleDto oluştur ✅ NestJS
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.3 Multi-Branch Role Assignment

  - POST /api/v1/users/:id/assign-role endpoint oluştur
  - Multi-branch role validation logic ekle
  - Permission check (sadece chain_owner/branch_manager rol atayabilir)
  - Branch-specific role assignment logic
  - _Requirements: 2.6, 3.2, 3.5_

- [x] 5. Multi-Branch Frontend Auth Context
  - ✅ useEnhancedAuth hook oluşturuldu (chain_id, branch_id, role ile genişletildi)
  - ✅ usePermissions hook oluşturuldu
  - ✅ JWT token decoding utilities eklendi (jwt.ts)
  - ✅ JWT token'dan chain_id, branch_id ve role parse et
  - ✅ Token expiration check ve automatic refresh logic
  - ✅ Permission-based utilities (hasPermission, hasRole, hasAnyRole)
  - ⏳ useBranches hook (chain owner için) - Future feature
  - ⏳ Branch switching logic - Future feature
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 5.6_

- [x] 6. User Management Page Components
- [x] 6.1 Multi-Branch UserListTable Component
  - ✅ ShadCN DataTable ile branch-scoped user listesi oluştur
  - ✅ Sorting, filtering, pagination ekle
  - ✅ Role-based action buttons (edit, delete, toggle status)
  - ✅ Hard delete functionality with confirmation dialog
  - ✅ UI text changed from "Remove User" to "Delete User"
  - ✅ Real-time updates için Zustand store kullan
  - ⏳ Branch selector dropdown (chain owner için) - Future feature
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.2_

- [x] 6.2 Multi-Branch CreateUserModal Component
  - ✅ Form validation ile user creation modal
  - ✅ Email, full_name, phone, password, role selection
  - ✅ Branch_id otomatik assignment
  - ✅ Success/error notifications
  - ✅ Integration with UserManagementPage
  - ✅ Auto-focus disabled for better UX
  - ⏳ Branch selection (chain owner için) - Future feature
  - _Requirements: 4.4, 6.3_

- [x] 6.3 EditUserModal Component
  - ✅ Existing user data pre-population
  - ✅ Email, full_name, phone, status update functionality
  - ✅ Permission-based field disabling (role field disabled)
  - ✅ Update confirmation with proper error handling
  - ✅ Auto-focus disabled for better UX
  - ✅ Real-time state updates without page refresh
  - ✅ Critical bug fix: Frontend/database sync issues resolved
  - ✅ Auth users display_name sync implemented
  - ⏳ Role change functionality - Handled by separate role assignment feature
  - _Requirements: 4.3, 4.4, 6.3_

- [ ] 6.4 RoleAssignmentDropdown Component
  - Role selection dropdown
  - Permission-based role options
  - Immediate role change API call
  - Visual feedback for role changes
  - _Requirements: 4.4, 3.2, 3.5_

- [x] 7. Permission-Based UI Controls
  - ✅ ProtectedRoute wrapper component oluşturuldu
  - ✅ Role-based route protection (requiredRole, requiredRoles)
  - ✅ Permission-based access control (requiredPermission, requiredPermissions)
  - ✅ Custom authorization checks ve unauthorized handling
  - ✅ ProtectionPresets for common scenarios
  - ✅ JWT token decoding ve parsing utilities
  - ⏳ Conditional rendering utilities - Partial (debug component created)
  - ⏳ Permission-based button states - Next step
  - ⏳ Role-based navigation menu items - Next step
  - _Requirements: 4.5, 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Error Handling and User Experience
- [ ] 8.1 Backend Error Handling
  - Custom exception filters implement et
  - Structured error responses (RFC 7807)
  - Security event logging
  - Rate limiting middleware
  - _Requirements: 5.4, 6.3_

- [ ] 8.2 Frontend Error Handling
  - UserManagementErrorBoundary component
  - Toast notifications için error handling
  - Form validation error messages
  - Network error recovery
  - _Requirements: 6.3, 6.4_

- [ ] 9. Security Testing and Validation
- [ ] 9.1 Cross-Tenant Security Tests
  - Restaurant isolation test cases yaz
  - JWT manipulation attempt tests
  - RLS policy validation tests
  - Unauthorized access attempt tests
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9.2 Role-Based Access Tests
  - Owner role permission tests
  - Manager role permission tests
  - Staff role permission tests
  - Guest role permission tests
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 10. Performance Optimization
  - Database query optimization
  - React Query caching configuration
  - Component memoization
  - Virtual scrolling for large user lists
  - _Requirements: 6.1, 6.2_

- [ ] 11. Integration Testing
- [ ] 11.1 API Integration Tests
  - Full CRUD flow testing
  - Authentication flow testing
  - Role assignment flow testing
  - Error scenario testing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 11.2 Frontend Integration Tests
  - User management page flow testing
  - Modal interactions testing
  - Permission-based UI testing
  - Mobile responsiveness testing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.5_

- [ ] 12. Documentation and Deployment
  - API endpoint documentation
  - Component usage documentation
  - Security best practices guide
  - Deployment configuration updates
  - _Requirements: All requirements validation_

## Implementation Status: Dual Backend Architecture

### Current Status ✅ Working
- **Local Development**: NestJS ile full-featured backend
- **Production**: Express.js serverless functions
- **API Contract**: Her iki backend aynı endpoint'leri implement ediyor
- **Response Format**: {data: ..., meta: ...} formatı consistent
- **Database**: Aynı Supabase instance kullanıyor
- **Authentication**: Supabase JWT ile consistent
- **Hard Delete**: User deletion completely removes records from database

### Production Express API Endpoints
- ✅ GET /api/v1/users/branch/:branchId (User listing)
- ✅ POST /api/v1/users (User creation)  
- ✅ PATCH /api/v1/users/:userId/branch/:branchId (Status toggle)
- ✅ DELETE /api/v1/users/:userId/branch/:branchId (User deletion with hard delete)
- ⏳ Role assignment endpoints - Next

### Key Benefits of Dual Approach
- **Development Speed**: NestJS ile hızlı geliştirme
- **Production Simplicity**: Express serverless ile kolay deploy
- **Cost Effective**: Serverless cold start optimization
- **Consistency**: Aynı API contract ve response format
- **Complete CRUD**: Full user lifecycle management (create, read, update, delete)

### Recent Completions (Latest Session)
- ✅ **Hard Delete Implementation**: Changed from soft delete (is_active: false) to hard delete
- ✅ **UI Text Update**: Changed "Remove User" to "Delete User" for clarity
- ✅ **Confirmation Dialog**: Added permanent deletion warning
- ✅ **Cascade Delete Logic**: Removes user from branch_users, user_profiles, and auth system
- ✅ **Express API Parity**: DELETE endpoint implemented in production backend
- ✅ **Frontend State Management**: Proper user removal from Zustand store
- ✅ **Database Cleanup**: Complete user removal when no other branches exist
- ✅ **EditUserModal Implementation**: Full user editing functionality with dialog pattern
- ✅ **Critical Bug Fix**: Frontend state sync with database (was showing updates only in UI)
- ✅ **Auth Users Sync**: user_profiles.full_name changes now sync to auth.users.display_name
- ✅ **Auto-Focus Fix**: Disabled auto-focus on modal dialogs for better UX
- ✅ **Express.js Full Update**: Complete user update endpoint in production API
- ✅ **TypeScript Fixes**: Resolved build errors for Vercel deployment

### **NEW: Permission & Security System (Current Session)**
- ✅ **JWT Decoding Utilities**: Client-side JWT token parsing with utils/jwt.ts
- ✅ **Enhanced useAuth Hook**: JWT parsing, token expiration check, auto-refresh logic
- ✅ **usePermissions Hook**: Role-based permission checking utilities
- ✅ **ProtectedRoute Component**: Page-level route protection with role/permission guards
- ✅ **Permission Safety**: Fixed undefined permissions array issues
- ✅ **Auth Debug Tools**: Comprehensive auth state debugging (temporary)
- ✅ **Security Foundation**: Base infrastructure for permission-based UI controls

## 🎯 Next Steps (Priority Order)

### **Immediate Priorities (Core CRUD Complete)**
1. **Role Assignment Express API** (4.3) - Production parity missing
   - POST `/api/v1/users/:userId/branch/:branchId/assign-role` endpoint
   - Maintain API contract consistency between NestJS and Express
   
2. **RoleAssignmentDropdown Component** (6.4) - Quick UX improvement  
   - Inline role changes in UserListTable
   - Immediate API call on role selection
   - Permission-based role options

### **Completed Security Features** ✅
3. **Frontend Auth Context** (5) - ✅ COMPLETED
   - ✅ useEnhancedAuth hook with chain_id, branch_id, role parsing
   - ✅ usePermissions hook for permission-based UI
   - ✅ JWT token parsing and refresh logic

4. **Permission-Based UI Controls & Route Protection** (5, 7) - ✅ FOUNDATION COMPLETE
   - ✅ **useEnhancedAuth hook**: JWT token parsing with chain_id, branch_id, role extraction
   - ✅ **usePermissions hook**: Role-based permission checking (can_delete_users, can_manage_users, etc.)
   - ✅ **ProtectedRoute wrapper**: Page-level route protection
   - ⏳ **Conditional rendering**: Permission-based UI component visibility - Next step
   - ⏳ **Navigation menu filtering**: Role'e göre sidebar menü öğeleri gizleme/gösterme
   - ⏳ **Action button controls**: "Delete User", "Add User" gibi butonların gösterilmesi
   - ⏳ **Settings page access**: Sadece manager+ roller settings'e girebilsin
   - ⏳ **Multi-branch access**: Chain owner tüm branch'leri görebilsin

### **Future Enhancements (Lower Priority)**
5. **Super Admin Panel Implementation** - Platform Management Layer
   - Add `/admin/*` routes for platform management
   - Chain management interface (list all restaurant chains)
   - Cross-chain user management and analytics
   - Platform-wide reporting and monitoring
   - Use integrated approach with existing backend/frontend infrastructure
   - **Note**: Not critical for current operation - restaurants can self-onboard and manage themselves

6. **Error Handling & UX** (8) - User experience
   - Better error boundaries and toast notifications
   - Form validation improvements
   - Network error recovery

7. **Performance & Testing** (9-11) - Optimization
   - Component memoization and virtual scrolling
   - Security testing and validation
   - Integration testing

### **Recommended Next Session Start:**

**Option A (Backend First):** 
1. Role Assignment Express API → RoleAssignmentDropdown → Permission Controls

**Option B (Security First) - RECOMMENDED:** 
1. **Permission Controls & Route Protection** → Role Assignment API → RoleAssignmentDropdown

**Neden Option B önerilirim:**
- 🔒 **Security critical**: Şu anda herkes her şeyi görebiliyor
- 🎯 **Foundation**: Permission system olmadan role assignment anlamsız
- 🚀 **Impact**: Tüm app'i etkileyen fundamental change

**Example Permission Scenarios to Implement:**
- `branch_staff` → Sadece kendi profilini editleyebilir, settings'e giremez
- `branch_manager` → User management yapabilir ama user silemez  
- `chain_owner` → Her şeyi yapabilir, tüm branch'leri görebilir