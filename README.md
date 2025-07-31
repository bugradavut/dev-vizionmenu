# Vision Menu - Multi-Tenant Restaurant Management Platform

**🏢 Enterprise-grade restaurant ordering and management system built with modern TypeScript stack**

**Status**: ✅ Production Ready | **Last Update**: January 2025 | **Version**: 1.0.0

---

## 🎯 Project Overview

Vision Menu is a comprehensive **multi-tenant restaurant management platform** similar to Adisyo or UEAT. The system supports restaurant chains with multiple branches, real-time order management, third-party integrations (Uber Eats, DoorDash), and sophisticated role-based access control.

### 🏗️ Architecture
- **Monorepo Structure**: PNPM workspaces with Turborepo
- **Multi-tenant**: Restaurant chains with branch-level isolation
- **Microservices**: API + Web + Worker applications
- **Type-safe**: End-to-end TypeScript implementation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PNPM 8+
- Redis (for queues)
- Supabase account

### Installation & Development

```bash
# Clone and install dependencies
git clone <repository-url>
cd vision-menu
pnpm install

# Start all services in development
pnpm dev                    # All apps
pnpm dev:web               # Frontend only (localhost:3000)
pnpm dev:api               # Backend only (localhost:3001)
pnpm dev:worker            # Worker only
```

### Environment Setup
Create `.env.local` files in each app directory:

```bash
# apps/api/.env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://localhost:6379

# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🏢 System Architecture

### Applications
```
apps/
├── api/        # NestJS + Express.js Backend API
├── web/        # Next.js 15 Frontend Application  
└── worker/     # Node.js Background Job Processor
```

### Shared Packages
```
packages/
├── types/      # Shared TypeScript definitions
├── ui/         # React component library (ShadCN-based)
└── config/     # Shared configuration (ESLint, Tailwind, etc.)
```

### Tech Stack
- **Backend**: NestJS, Express.js, TypeScript, Supabase (PostgreSQL)
- **Frontend**: Next.js 15, React 19, Tailwind CSS, ShadCN UI
- **Database**: Supabase with Row-Level Security (RLS)
- **Authentication**: Supabase Auth + JWT with custom claims
- **Queue**: Redis + BullMQ for background jobs
- **State Management**: React Context + Zustand
- **Payments**: Stripe integration
- **Deployment**: Vercel (unified Express.js backend)

---

## 🔐 Multi-Tenant Security

### Role Hierarchy
```
chain_owner (Level 3)      # Full access across all branches
├── branch_manager (Level 2)  # Branch-specific management
├── branch_staff (Level 1)    # Limited operations access
└── branch_cashier (Level 0)  # Payment processing focused
```

### Permission System
- **Resource-based permissions**: `menu:read`, `orders:write`, `users:delete`
- **Branch-level isolation**: Users can only access assigned branches
- **Cross-branch protection**: Prevents unauthorized data access
- **JWT context**: Tokens contain branch and role information

---

## 📊 Business Features

### Order Management
- **Multi-channel orders**: QR codes, web, mobile, third-party platforms
- **Real-time dashboard**: Live order tracking and status updates
- **Order sources**: Uber Eats, DoorDash, phone, direct web orders
- **Status tracking**: Pending → Confirmed → Preparing → Ready → Delivered

### Restaurant Operations
- **Chain management**: Multiple restaurant brands under one account
- **Branch management**: Individual locations with local settings
- **Menu management**: Hierarchical menu structure with variations
- **User management**: Role-based staff management per branch
- **Analytics**: Revenue tracking, order statistics, performance metrics

### Third-Party Integrations
- **Uber Eats**: Order synchronization and menu updates
- **DoorDash**: Bi-directional order and menu sync
- **Stripe**: Payment processing and webhook handling
- **Email notifications**: Order confirmations and status updates

---

## 🔄 Background Job System

### Queue Types
- **Email Queue**: Order confirmations, status updates, notifications
- **Webhook Queue**: Stripe payments, third-party platform webhooks
- **Sync Queue**: Menu and order synchronization with external platforms
- **Notification Queue**: Push notifications and SMS alerts

### Job Processing
- **Redis-based**: BullMQ for reliable job processing
- **Retry logic**: Exponential backoff with 3 retry attempts
- **Monitoring**: Comprehensive logging and job status tracking
- **Scalable**: Configurable worker concurrency

---

## 📱 Frontend Features

### User Interface
- **Dark/Light themes**: System preference support
- **Multi-language**: English/French internationalization
- **Responsive design**: Mobile-first approach
- **Real-time updates**: Live order status changes
- **Optimistic updates**: Immediate UI feedback

### Order Dashboard
- **Live orders**: Real-time order monitoring with filters
- **Order history**: Advanced filtering with date ranges
- **Order details**: Comprehensive order information display
- **Status management**: One-click status updates for staff

### User Management
- **User creation**: Role-based user creation with permissions
- **Role assignment**: Hierarchical role management
- **Branch assignment**: Multi-branch user support
- **Permission visualization**: Clear role and permission display

---

## 🚀 Development & Deployment

### Scripts
```bash
# Development
pnpm dev                   # Start all apps
pnpm build                 # Build all apps
pnpm lint                  # Lint all code
pnpm type-check           # TypeScript checking

# Individual apps
pnpm dev:web              # Next.js frontend
pnpm dev:api              # NestJS backend  
pnpm dev:worker           # Background worker
```

### Deployment Workflow
1. **Development**: `dev-vizionmenu.vercel.app` (auto-deploy on push)
2. **Testing**: Manual testing on development environment
3. **Production**: Deploy to company repository with automated script

```powershell
# Automated deployment
.\deploy-to-company.ps1 "Release v1.2.0"
```

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Vercel deployment with environment variables
- **Database**: Single Supabase instance across environments
- **Unified Backend**: Same Express.js code for dev and production

---

## 📂 Key Files & Directories

### API Structure
```
apps/api/
├── api/index.js          # Unified Express.js server (dev + prod)  
├── src/                  # NestJS source code (archived)
└── package.json          # API dependencies
```

### Web Application
```
apps/web/src/
├── app/                  # Next.js App Router pages
├── components/           # React components
├── contexts/             # React Context providers
├── hooks/                # Custom hooks
├── services/             # API integration
└── types/                # TypeScript definitions
```

### Background Worker
```
apps/worker/src/
├── processors/           # Job processors
├── queues/               # Queue management
├── config/               # Worker configuration
└── utils/                # Utilities and logging
```

---

## 🔧 Configuration Files

- **`turbo.json`**: Monorepo build orchestration
- **`pnpm-workspace.yaml`**: Package workspace configuration
- **`Auth-sql.md`**: Complete database schema with test data
- **`endpoints.md`**: API endpoint documentation and status
- **`DEPLOYMENT.md`**: Deployment workflow and procedures

---

## 📊 Database Schema

### Core Tables
- **`restaurant_chains`**: Top-level restaurant brands
- **`branches`**: Individual restaurant locations
- **`branch_users`**: User-branch associations with roles
- **`user_profiles`**: Extended user information
- **`menu_categories`** & **`menu_items`**: Hierarchical menu structure
- **`orders`** & **`order_items`**: Complete order management
- **Row-Level Security (RLS)**: Branch-level data isolation

### Authentication Flow
- **Supabase Auth**: Primary authentication provider
- **Custom JWT claims**: Branch and role context
- **Multi-branch support**: Users can access multiple branches
- **Automatic profile creation**: Triggers for user profile setup

---

## 🛡️ Security Features

- **Authentication**: Multi-layer auth with Supabase + custom validation
- **Authorization**: Role-based access control with permissions
- **Data isolation**: Branch-level RLS policies
- **CORS**: Proper cross-origin configuration
- **Input validation**: Comprehensive request validation
- **JWT security**: Token-based authentication with refresh

---

## 📈 Performance & Monitoring

- **Caching**: Redis-based application caching
- **Real-time**: Supabase real-time subscriptions
- **Queue monitoring**: Job status and performance tracking
- **Error handling**: Comprehensive error logging and recovery
- **Health checks**: API and service health endpoints

---

## 🎯 Current Status & Next Steps

### ✅ Completed Features
- Multi-tenant authentication and authorization
- Complete user management system
- Real-time order dashboard
- Background job processing
- Third-party integration framework
- Responsive UI with theme support

### 🔄 In Development
- Order management endpoints (in progress)
- Menu management system
- Advanced analytics and reporting
- Mobile application API

### 🚀 Future Enhancements
- Push notifications
- Advanced reporting dashboard
- Mobile apps (iOS/Android)
- Expanded third-party integrations

---

## 📞 Support & Documentation

- **Project Description**: See `project-description.md` for detailed technical overview
- **API Documentation**: See `endpoints.md` for complete API reference
- **Database Schema**: See `Auth-sql.md` for database setup and schema
- **Deployment**: See `DEPLOYMENT.md` for deployment procedures

**Architecture**: Enterprise-grade, production-ready system designed for scalability and maintainability.

---

*Last updated: January 2025 | Built with ❤️ using TypeScript*
