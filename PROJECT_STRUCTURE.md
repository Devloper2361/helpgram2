# HelpGram Production Architecture & Folder Structure

This file contains the final production folder and file structure for the HelpGram MVP, reflecting a monolithic Next.js App Router full-stack implementation with a custom server for WebSockets and separate background worker processes.

```text
helpgram-repo/
├── .github/                           # CI/CD pipelines
│   └── workflows/
│       ├── ci.yml                     # Runs type checks, linting, Prisma checks, and unit tests
│       └── deploy.yml                 # Builds Docker images & deploys to production
│
├── docker/                            # Containerization strategy
│   ├── production/
│   │   ├── Dockerfile.web             # Next.js web app & API Server
│   │   ├── Dockerfile.worker          # Cron jobs & background workers
│   │   └── docker-compose.yml         # Prod-like service mapping
│   └── local/
│       └── docker-compose.dev.yml     # Local PostgreSQL, Redis, and PgBouncer
│
├── prisma/                            # Database ORM & Schema
│   ├── schema.prisma                  # Master PostgreSQL schema definitions
│   ├── seed.ts                        # Development data seeder (Admin, mock tasks)
│   └── migrations/                    # Auto-generated SQL transaction files
│
├── monitoring/                        # APM & Error Tracking
│   ├── datadog/
│   │   └── agent.yaml                 # Datadog container metadata
│   └── sentry/
│       └── config.js                  # Global error tracking parameters
│
├── jobs/                              # Background Workers (Node-Cron / Queue)
│   ├── runner.ts                      # Independent worker entry point
│   ├── cron/
│   │   └── auto-release-escrow.ts     # Releases funds 72h after task completion
│   └── queues/
│       ├── email-dispatcher.ts        # Transacts Postmark/SendGrid emails
│       └── push-notifications.ts      # Transacts Firebase Cloud Messaging (FCM)
│
├── src/                               # Application Source Code
│   ├── app/                           # Next.js App Router (Frontend & API)
│   │   ├── (auth)/                    # Route Group: Authentication
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/                    # Route Group: Core Dashboard & Features
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx           # Task marketplace/search
│   │   │   │   ├── new/page.tsx       # Create task
│   │   │   │   └── [id]/page.tsx      # Task details & lifecycle actions
│   │   │   ├── wallet/
│   │   │   │   └── page.tsx           # Balances, deposits, withdrawals
│   │   │   ├── profile/
│   │   │   │   ├── edit/page.tsx
│   │   │   │   └── [id]/page.tsx      # Public tasker profile & reviews
│   │   │   └── chat/
│   │   │       ├── page.tsx
│   │   │       └── [taskId]/page.tsx  # Direct message thread
│   │   ├── admin/                     # Route Group: Moderation
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── disputes/[id]/page.tsx
│   │   ├── api/                       # Next.js Route Handlers (REST API)
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── tasks/[id]/route.ts
│   │   │   ├── wallet/deposit/route.ts
│   │   │   ├── wallet/withdraw/route.ts
│   │   │   └── webhooks/
│   │   │       ├── stripe/route.ts    # Secure payment/escrow hooks
│   │   │       └── kyc/route.ts       # Identity verification hooks
│   │   ├── layout.tsx                 # Root layout (Providers, Fonts, Meta)
│   │   └── globals.css                # Tailwind CSS entry & global styles
│   │
│   ├── components/                    # React UI Engine
│   │   ├── ui/                        # Shadcn/UI Primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── badge.tsx
│   │   ├── domain/                    # Business-Logic Bound Components
│   │   │   ├── tasks/
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── EscrowStatus.tsx
│   │   │   ├── chat/
│   │   │   │   └── ChatWindow.tsx
│   │   │   └── wallet/
│   │   │       └── TransactionList.tsx
│   │   └── shared/                    # Layout Elements
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   │
│   ├── lib/                           # Core Integrations & Clients
│   │   ├── prisma.ts                  # Prisma Singleton (DB Connection Pool)
│   │   ├── stripe.ts                  # Stripe API Client
│   │   ├── redis.ts                   # Redis Client (Caching & PubSub)
│   │   ├── s3.ts                      # AWS S3 / Cloudflare R2 Uploads
│   │   ├── socket.ts                  # Socket.io configuration
│   │   └── utils.ts                   # Tailwind merge & formatting helpers
│   │
│   ├── services/                      # Decoupled Business Logic (ACID)
│   │   ├── escrow.service.ts          # DB transactions for locking/releasing funds
│   │   ├── search.service.ts          # Geospatial queries (PostGIS wrapping)
│   │   └── dispute.service.ts         # Admin fund routing overrides
│   │
│   ├── hooks/                         # React Hooks
│   │   ├── useSocket.ts               # Socket.io connection manager
│   │   ├── useGeolocation.ts          # Browser GPS coordinate grabber
│   │   └── useDebounce.ts
│   │
│   └── types/                         # TypeScript Declarations
│       ├── index.d.ts                 # Global type overrides
│       ├── database.types.ts          # DB payload structures
│       └── api.types.ts               # Request/Response shapes
│
├── server.ts                          # Custom Node.js Http Server (Wrapper for Next.js to inject Socket.io)
├── .env.example                       # Documented environment variables
├── .eslintrc.json                     # Linting rules
├── .gitignore                         # SCM exclusions
├── components.json                    # Shadcn CLI mapping
├── middleware.ts                      # Next.js Edge Middleware (Auth routing & RBAC)
├── next.config.mjs                    # Next.js compiler settings
├── package.json                       # Mono-package dependencies
├── postcss.config.mjs                 # CSS compilation steps
├── tailwind.config.ts                 # Design tokens & UI themes
└── tsconfig.json                      # Strict TypeScript compiler options
```
