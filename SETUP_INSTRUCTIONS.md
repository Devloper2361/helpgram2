# HelpGram MVP Setup & Initialization Guide

## 1. Initial Prisma Migration Plan

The first migration establishes the core relational schema, indexes, and constraints using PostgreSQL specific extensions.

**Pre-migration Checklist:**
1. Ensure the PostgreSQL extension `pgcrypto` is available (Prisma's `gen_random_uuid()` relies on it in older PG versions, though PG 13+ supports it natively). 
2. Ensure PostGIS is installed if spatial features (`locationLat`, `locationLng`) evolve beyond basic B-tree indexing.
3. Validate precision limits. `Decimal(12,4)` requires no specific extensions, but ensures monetary safety.

**Execution:**
Once the database is running, the initial migration is generated via:
`npx prisma migrate dev --name init_helpgram_schema_v2`

This single migration will lock in the baseline schema. Subsequent migrations must be strictly additive or safely handle destructive changes via Prisma's `$executeRaw` for data migrations.

## 2. Seed Data Strategy

`prisma/seed.ts` is essential for reproducible development environments. 

**Seed Requirements:**
- **1 Admin User:** Standard email (`admin@helpgram.com`) with role `ADMIN`.
- **2 Requester Users:** Standard users with pre-filled `Profile` data (location, bio) and simulated loaded wallets.
- **3 Tasker Users:** Standard users with verified profiles (`isVerified: true`), standard `Skill` entries, and simulated Stripe connected accounts.
- **5 Tasks in mixed states:**
    - 2 `OPEN` tasks
    - 1 `IN_PROGRESS` task with an active `TaskApplication`, `MessageThread`, and `EscrowEntry`.
    - 1 `COMPLETED` task with `Review` entries and `Transactions`.
    - 1 `DISPUTED` task testing the admin dispute queue.

This strategy ensures every UI state can be tested immediately upon project boot without manual data entry.

## 3. Development Database Setup & 4. Local Docker Setup

The local environment relies on `docker-compose` to run PostgreSQL (with PostGIS) and Redis (for Socket.io and background jobs) without cluttering the host OS.

### `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3-alpine
    container_name: helpgram_postgres_dev
    environment:
      POSTGRES_USER: helpgram_dev
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: helpgram
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: helpgram_redis_dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  pg_data:
  redis_data:
```

## 5. Commands to Initialize the Project

Run these commands in order to bootstrap the environment from scratch.

1. **Start Infrastructure:**
   ```bash
   docker-compose -f docker/local/docker-compose.dev.yml up -d
   ```

2. **Configure Environment:**
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://helpgram_dev:dev_password@localhost:5432/helpgram?schema=public"
   REDIS_URL="redis://localhost:6379"
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Initialize Prisma & Run Migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init_helpgram_schema_v2
   ```

5. **Seed the Development Database:**
   ```bash
   npx prisma db seed
   ```

6. **Start the Development Server:**
   ```bash
   npm run dev
   ```
