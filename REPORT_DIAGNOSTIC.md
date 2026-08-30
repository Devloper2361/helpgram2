# HELPGRAM — READ-ONLY DATABASE ENVIRONMENT DIAGNOSTIC

## A. DATABASE DIAGNOSTIC STATUS
Database file exists but is completely empty (0 bytes).

## B. PRISMA SCHEMA STATUS
- **Location**: `prisma/schema.prisma`
- **Provider**: `sqlite`
- **Datasource Configuration**: `url = "file:./dev.db"`
- **User Model**: Present in schema
- **Expectation**: The schema defines and expects a `User` table to exist.

## C. DATABASE TARGET
The database target resolves to the local SQLite file: `prisma/dev.db`

## D. ACTUAL TABLES
None. The database file is 0 bytes.

## E. USER TABLE STATUS
Missing. The table does not exist in the actual SQLite database.

## F. SEED DATA STATUS
- **Expected Data**: `prisma/seed.ts` is configured to create `admin@helpgram.local`, `moderator@helpgram.local`, `customer@helpgram.local`, and multiple worker/helper accounts along with generated historical tasks.
- **Actual Data**: Not seeded.

## G. MIGRATION STATUS
- **History**: Migration files exist in `prisma/migrations` (e.g., `20260824150000_add_worker_welfare`, `20260825000000_sync_task_location_fields`).
- **Database State**: The actual database contains no migration history (`_prisma_migrations` table is missing) because the file is entirely empty.

## H. RUNTIME CONFIGURATION
- **Prisma Initialization**: `PrismaClient` is instantiated via `new PrismaClient()` in `src/lib/prisma.ts`.
- **Target Connection**: Because `url = "file:./dev.db"` is hardcoded in the schema, Prisma reads from `prisma/dev.db`.
- **Environment**: A system `DATABASE_URL` (PostgreSQL) is set in the environment, but it is explicitly ignored because the Prisma schema hardcodes the SQLite file path instead of using `env("DATABASE_URL")`.

## I. ROOT CAUSE CLASSIFICATION
**C. DATABASE SCHEMA NOT INITIALIZED**
Evidence: The file `prisma/dev.db` exists on disk but is exactly 0 bytes. The schema and migrations exist in the codebase, but they were never applied to the database file in this runtime environment. When `src/api/auth.routes.ts` invokes `prisma.user.findUnique()`, Prisma throws an error because the SQLite database is completely empty.

## J. PRODUCTION SAFETY
Confirmed development-only. The application is connecting to a local `prisma/dev.db` SQLite file. No external or production databases were accessed.

## K. FILE CHANGES
NONE

## L. BUILD STATUS
PASS
(Completed successfully; a standard Vite chunk-size warning was logged but did not fail the build).

## M. EXACT NEXT ACTION
Initialize the database by running `npx prisma migrate deploy` (or `npx prisma db push`), and then populate it using `npm run seed`.

==================================================
FINAL STATUS
==================================================
REQUIRES DATABASE INITIALIZATION
