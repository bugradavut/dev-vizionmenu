
** Project Description**

```markdown
You're helping me build a restaurant ordering and management platform similar to Adisyo or UEAT. This is a web-based application built with a **monorepo architecture** using **TypeScript** end-to-end.

I'm a solo developer using the following stack:

## Tech Stack
- **Frontend**: Next.js (App Router, Server Components), TailwindCSS, ShadCN UI, TypeScript
- **Backend**: 
  - **Local Development**: NestJS (REST API, modular structure), TypeScript
  - **Production**: Express.js Serverless Functions (Vercel)
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Queue & Cache**: BullMQ + Upstash Redis
- **Auth**: Supabase Auth (JWT with `restaurant_id` claim)
- **Payments**: Stripe tokenization (no card storage)
- **DevOps**: Monorepo (pnpm + Turborepo), Deployed on Vercel (web & api)

## Folder Structure
```

apps/
web/        → Next.js (Client UI + Admin UI)
api/        → NestJS API (local dev) + Express.js (production serverless)
  ├── src/  → NestJS modular structure (controllers, services, modules)
  └── api/  → Express.js serverless functions for Vercel
worker/     → 3rd-party order sync with Uber Eats / DoorDash

packages/
ui/         → Reusable React components (ShadCN based)
types/      → Shared TypeScript types (Order, Menu, etc.)
config/     → Shared config (eslint, tailwind, jest, tsconfig)

```

## Project Goals
- QR-based menu and ordering for guests
- Admin backoffice for managing menus, orders, reports
- Merge Uber Eats / DoorDash orders into the same order flow
- Mobile-first UI + Offline-ready PWA

Keep all suggestions within this tech stack. Use clean, scalable code. Every suggestion should respect the multi-tenant architecture (`restaurant_id` based isolation) and follow best practices in modular design, REST API, and frontend components.

Always generate **TypeScript**, and avoid any technology outside of this stack.
```

