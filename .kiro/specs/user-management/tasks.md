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


  - GET /api/v1/branches/:branchId/users endpoint (branch-scoped)
  - GET /api/v1/chains/:chainId/users endpoint (chain-scoped)
  - POST /api/v1/branches/:branchId/users endpoint (create user)
  - PUT /api/v1/users/:id endpoint (update user)
  - DELETE /api/v1/users/:id endpoint (delete user)
  - POST /api/v1/users/:id/switch-branch endpoint (branch transfer)
  - CreateUserDto, UpdateUserDto, AssignRoleDto, SwitchBranchDto oluştur
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.3 Multi-Branch Role Assignment

  - POST /api/v1/users/:id/assign-role endpoint oluştur
  - Multi-branch role validation logic ekle
  - Permission check (sadece chain_owner/branch_manager rol atayabilir)
  - Branch-specific role assignment logic
  - _Requirements: 2.6, 3.2, 3.5_

- [ ] 5. Multi-Branch Frontend Auth Context
  - useAuth hook'unu chain_id, branch_id, role ile genişlet
  - usePermissions hook oluştur
  - useBranches hook oluştur (chain owner için)
  - JWT token'dan chain_id, branch_id ve role parse et
  - Branch switching logic ekle
  - Token refresh logic ekle
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 5.6_

- [ ] 6. User Management Page Components
- [ ] 6.1 Multi-Branch UserListTable Component
  - ShadCN DataTable ile branch-scoped user listesi oluştur
  - Branch selector dropdown (chain owner için)
  - Sorting, filtering, pagination ekle
  - Role-based action buttons (edit, delete, transfer)
  - Real-time updates için React Query kullan
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.2_

- [ ] 6.2 Multi-Branch CreateUserModal Component
  - Form validation ile user creation modal
  - Email, full_name, role selection
  - Branch selection (chain owner için)
  - Success/error notifications
  - Branch_id otomatik assignment
  - _Requirements: 4.4, 6.3_

- [ ] 6.3 EditUserModal Component
  - Existing user data pre-population
  - Role change functionality
  - Permission-based field disabling
  - Update confirmation
  - _Requirements: 4.3, 4.4, 6.3_

- [ ] 6.4 RoleAssignmentDropdown Component
  - Role selection dropdown
  - Permission-based role options
  - Immediate role change API call
  - Visual feedback for role changes
  - _Requirements: 4.4, 3.2, 3.5_

- [ ] 7. Permission-Based UI Controls
  - ProtectedRoute wrapper component oluştur
  - Conditional rendering utilities
  - Permission-based button states
  - Role-based navigation menu items
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