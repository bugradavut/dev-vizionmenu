# Multi-Branch User Management System Design

## Overview

Bu design dokümanı, VizionMenu'nun multi-branch (çok şubeli) User Management sisteminin teknik detaylarını açıklar. Sistem, restaurant chains → branches → users hiyerarşisini destekleyerek, mevcut schema'yı genişletecek ve branch-based authentication, role-based access control ve React-based frontend interface sağlayacaktır.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │  Express.js API │    │   Supabase DB   │
│                 │    │                 │    │                 │
│ - User Mgmt UI  │◄──►│ - REST API      │◄──►│ - RLS Policies  │
│ - Role Guards   │    │ - JWT Auth      │    │ - JWT Claims    │
│ - Permissions   │    │ - Serverless    │    │ - Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Architecture Strategy

Projede **unified Express.js backend** yaklaşımı kullanılmaktadır:

#### Development & Production Backend
- **Framework**: Express.js (lightweight, fast, flexible)
- **Location**: `apps/api/api/index.js`
- **Platform**: Vercel Serverless (Production) + Local Dev
- **Benefits**: 
  - Production-dev parity (aynı kod her yerde)
  - Fast deployment, low cold start
  - Simple debugging and maintenance
  - Single codebase to maintain

#### Local Development
- **Command**: `npm run dev` → `node api/index.js`
- **Port**: `localhost:3001`
- **Features**: Same endpoints as production
- **Benefits**: What you develop is what you deploy

#### Production Deployment
- **Platform**: Vercel Serverless Functions
- **Build**: `cp api/index.js index.js`
- **URL**: `https://dev-vizionmenu-web.vercel.app`
- **Benefits**: Zero-config deployment, auto-scaling

### Database Layer Enhancements

Mevcut schema'ya eklenecek komponenler:

1. **Restaurant Chains Table** - Ana restaurant markalarını tutar
2. **Branches Table** - Her chain'in şubelerini tutar  
3. **Branch Users Table** - restaurant_users'ı branch bazlı yapar
4. **JWT Claims Function** - chain_id, branch_id ve role bilgilerini JWT'ye ekler
5. **Auth Trigger** - auth.users → user_profiles sync
6. **Enhanced RLS Policies** - Branch-based güvenlik

## Components and Interfaces

### 1. Database Enhancements

#### Multi-Branch Database Schema
```sql
-- Restaurant Chains (Ana markalar)
CREATE TABLE restaurant_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches (Şubeler)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES restaurant_chains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address JSONB,
  location POINT,
  phone TEXT,
  email TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain_id, slug)
);

-- Branch Users (Şube kullanıcıları)
CREATE TABLE branch_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'branch_staff',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- JWT Claims Function
CREATE OR REPLACE FUNCTION auth.get_user_claims(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
BEGIN
  SELECT jsonb_build_object(
    'chain_id', rc.id::text,
    'branch_id', bu.branch_id::text,
    'role', bu.role,
    'permissions', bu.permissions,
    'chain_name', rc.name,
    'branch_name', b.name
  ) INTO claims
  FROM branch_users bu
  JOIN branches b ON b.id = bu.branch_id
  JOIN restaurant_chains rc ON rc.id = b.chain_id
  WHERE bu.user_id = $1 AND bu.is_active = true
  LIMIT 1;
  
  RETURN COALESCE(claims, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Auth Sync Trigger
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Express.js Backend Architecture

#### File Structure
```
apps/api/
├── api/
│   └── index.js          # Main Express app (unified for dev & prod)
├── package.json          # Dependencies & scripts
└── README.md
```

#### Main Express App Structure (`api/index.js`)
```javascript
// Core Components:
// 1. Express app setup with CORS
// 2. Supabase client integration
// 3. JWT authentication middleware
// 4. API endpoints:
//    - GET  /health              # Health check
//    - GET  /auth/profile        # Get user profile with roles
//    - POST /api/v1/users        # Create user
//    - GET  /api/v1/users/branch/:branchId  # List branch users
//    - PATCH /api/v1/users/:userId/branch/:branchId  # Update user
//    - DELETE /api/v1/users/:userId/branch/:branchId # Delete user
// 5. Error handling & 404 routes
// 6. Local dev server (port 3001)
// 7. Vercel export
```

#### Key Functions
- **Authentication**: JWT token verification via Supabase
- **Authorization**: Role-based access control
- **Database**: Direct Supabase client queries
- **Error Handling**: Consistent error responses
- **CORS**: Frontend integration support

### 3. Frontend Components Architecture

#### Component Structure
```
apps/web/src/components/user-management/
├── UserManagementPage.tsx
├── UserListTable.tsx
├── CreateUserModal.tsx
├── EditUserModal.tsx
├── RoleAssignmentDropdown.tsx
├── UserActionButtons.tsx
└── hooks/
    ├── useUsers.ts
    ├── useUserMutations.ts
    └── usePermissions.ts
```

## Data Models

### JWT Payload Interface
```typescript
interface JwtPayload {
  sub: string; // user_id
  email: string;
  chain_id: string;
  branch_id: string;
  role: 'chain_owner' | 'branch_manager' | 'branch_staff' | 'branch_cashier';
  permissions: string[];
  chain_name: string;
  branch_name: string;
  iat: number;
  exp: number;
}
```

### User Entity
```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  chain_id: string;
  branch_id: string;
  branch_name: string;
  role: UserRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type UserRole = 'chain_owner' | 'branch_manager' | 'branch_staff' | 'branch_cashier';

interface Branch {
  id: string;
  chain_id: string;
  name: string;
  slug: string;
  address?: any;
  phone?: string;
  email?: string;
  is_active: boolean;
}

interface RestaurantChain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  branches: Branch[];
}
```

### API Response Models
```typescript
// Success Response
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Error Response (RFC 7807)
interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}
```

## Error Handling

### Backend Error Handling

#### Express.js Error Handling
```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // JWT authentication errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'JWT token invalid or missing'
    });
  }
  
  // Permission errors
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden', 
      message: 'Insufficient permissions for this operation'
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});
```

#### Authentication Middleware
```javascript
// JWT verification middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
  
  req.user = user;
  next();
};
```

### Frontend Error Handling

#### Error Boundary Component
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class UserManagementErrorBoundary extends Component<
  PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <UserManagementErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Backend Testing

#### Unit Tests
- **Authentication Tests**: JWT token verification
- **API Endpoint Tests**: Individual route handlers  
- **Database Query Tests**: Supabase integration
- **Permission Tests**: Role-based access control

#### Integration Tests
- **API Endpoint Tests**: Full request/response cycle
- **Database Tests**: RLS policies, triggers
- **Security Tests**: Cross-tenant isolation

### Frontend Testing

#### Component Tests
- **User List Table**: Rendering, sorting, filtering
- **Modals**: Form validation, submission
- **Permission Guards**: Conditional rendering

#### E2E Tests
- **User Management Flow**: Create, edit, delete users
- **Role Assignment**: Permission changes
- **Security**: Unauthorized access attempts

### Security Testing

#### Cross-Tenant Testing
```typescript
describe('Cross-Tenant Security', () => {
  it('should prevent access to other restaurant users', async () => {
    const restaurant1User = await createTestUser('restaurant-1');
    const restaurant2User = await createTestUser('restaurant-2');
    
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${restaurant1User.token}`);
    
    expect(response.body.data).not.toContainEqual(
      expect.objectContaining({ restaurant_id: 'restaurant-2' })
    );
  });
});
```

## Performance Considerations

### Database Optimization
- **Indexes**: restaurant_id, user_id, role columns
- **Query Optimization**: Efficient RLS policy queries
- **Connection Pooling**: Supabase connection management

### Frontend Optimization
- **React Query**: Caching and background updates
- **Virtual Scrolling**: Large user lists
- **Lazy Loading**: Modal components
- **Memoization**: Expensive permission calculations

### API Optimization
- **Pagination**: Large user lists
- **Field Selection**: GraphQL-style field selection
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: Prevent abuse

## Deployment and Monitoring

### Environment Configuration
```typescript
// Environment variables
interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  REDIS_URL: string;
}
```

### Monitoring and Logging
- **API Metrics**: Response times, error rates
- **Security Events**: Failed authentication attempts
- **User Activity**: Role changes, permission updates
- **Performance**: Database query performance

### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    message: 'Backend API is healthy'
  });
});

// Detailed health check (future enhancement)
app.get('/health/detailed', async (req, res) => {
  const checks = {
    status: 'ok',
    database: await checkSupabaseConnection(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  res.json(checks);
});
```