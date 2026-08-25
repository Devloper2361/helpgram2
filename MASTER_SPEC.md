# HelpGram MVP Master Specification (Launch Target: 10,000 Users)

## 1. Complete Feature Inventory
**Must Have (MVP):**
- Unified User Accounts (can act as Tasker or Requester).
- Profile Setup (Bio, Skills, Basic Identity).
- Task Creation (Title, Desc, Price, Time, Distance/Location).
- Task Discovery (Search, Filter by distance/category).
- Task Acceptance Flow.
- Secure Chat (Tasker <-> Requester).
- Integrated Wallet (Stripe Connect Setup, Deposit, Withdraw).
- Task Escrow System (Lock funds, Release upon completion).
- Post-Task Reviews & Ratings (1-5 Stars).
- Admin Moderation & Basic Dispute Management.

## 2. Database Tables (Relational / PostgreSQL via Prisma)
- `users`: id, email, password_hash, push_token, role, created_at, updated_at
- `profiles`: user_id, full_name, bio, location_lat, location_lng, trust_score, is_verified, avatar_url
- `skills`: user_id, skill_name
- `tasks`: id, requester_id, tasker_id, title, desc, price, status, scheduled_for, location_lat, location_lng, created_at, updated_at
- `wallets`: user_id, stripe_account_id, balance_available, balance_escrowed
- `transactions`: id, wallet_id, task_id, amount, type (deposit|withdraw|escrow_lock|escrow_release), status, created_at
- `messages`: id, task_id, sender_id, receiver_id, content, is_read, created_at
- `reviews`: id, task_id, reviewer_id, reviewee_id, rating, comment, created_at
- `disputes`: id, task_id, raised_by_id, reason, status, resolution, created_at
- `notifications`: id, user_id, content, type, is_read, created_at

## 3. API Endpoints (Express REST API)
- **Auth:**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
- **Users:**
  - `GET /api/users/:id`
  - `PUT /api/users/profile`
  - `POST /api/users/verify`
- **Tasks:**
  - `GET /api/tasks` (List/Search)
  - `POST /api/tasks` (Create)
  - `GET /api/tasks/:id`
  - `PUT /api/tasks/:id/status` (Update state)
  - `POST /api/tasks/:id/apply`
- **Messages:**
  - `GET /api/tasks/:id/messages`
  - `POST /api/tasks/:id/messages`
- **Wallet/Escrow:**
  - `GET /api/wallet/balance`
  - `GET /api/wallet/transactions`
  - `POST /api/wallet/deposit` (Stripe Checkout)
  - `POST /api/wallet/withdraw` (Stripe Payout)
- **Reviews:**
  - `POST /api/tasks/:id/reviews`

## 4. Pages (React Router SPA)
- `/` - Dashboard (Activity, Suggested Tasks)
- `/auth/login` & `/auth/register`
- `/tasks` - Task Marketplace
- `/tasks/:id` - Task Detail
- `/chat` - Messaging interface
- `/wallet` - Financial overview
- `/profile` - Current user profile edit
- `/profile/:id` - Public profile view
- `/admin` - Moderator dashboard

## 5. Components
- **UI Base:** Button, Card, Input, Label, Badge, Avatar, Dialog, Sheet, Tabs (Shadcn UI)
- **Domain:** `TaskCard`, `TransactionList`, `ChatBubble`, `ReviewStars`, `EscrowStatusBadge`.

## 6. User Flows
- **Requester Flow:** Signup -> Create Task -> Deposit Funds -> Lock Escrow -> Wait for Tasker -> Accept Tasker -> Chat -> Mark Completed -> Release Escrow -> Leave Review.
- **Tasker Flow:** Signup -> Verify ID & Connect Stripe -> Browse Tasks -> Apply/Accept Task -> Chat -> Perform Work -> Wait for Release -> Get Paid -> Withdraw.

## 7. Admin Flows
- **Moderation:** View Flagged Users -> Suspend/Ban.
- **Verification:** Review submitted ID/Photos -> Approve/Reject.
- **Disputes:** Open Dispute -> Read Chat History -> Override Escrow (Refund Requester or Force Payout Tasker).

## 8. Notifications
- `TASK_ACCEPTED`: "Someone accepted your task."
- `NEW_MESSAGE`: "New message from [User]."
- `FUNDS_RELEASED`: "Your escrow was released. +$X"
- `DISPUTE_OPENED`: "A dispute was opened for [Task]."

## 9. Task States
- `OPEN` -> `IN_PROGRESS` -> `COMPLETED` -> `CANCELLED`
- Alternative path: `IN_PROGRESS` -> `DISPUTED` -> `RESOLVED`

## 10. Payment / Escrow States
- `AVAILABLE`: Freely accessible.
- `LOCKED`: Held in escrow for an active task.
- `RELEASED`: Transferred from Requester to Tasker.
- `REFUNDED`: Returned to Requester.

## 11. Dispute States
- `PENDING_REVIEW`: Awaiting Admin.
- `IN_MEDIATION`: Admin requesting info from parties.
- `RESOLVED_REFUND`: Escrow returned heavily to requester.
- `RESOLVED_PAYOUT`: Escrow forced to tasker.

## 12. Verification States
- `UNVERIFIED`
- `PENDING` (Docs Submitted)
- `VERIFIED`
- `REJECTED`

## 13. Security Requirements
- All API routes except `/auth` must require JWT (HttpOnly cookies preferred).
- Role-Based Access Control (RBAC) via JWT payload (`role: 'admin'`).
- Escrow actions must occur in an ACID-compliant DB transaction (Prisma `$transaction`).
- Rate limiting on `/auth` and `/chat` to prevent spam/brute force.
- Prevent CSRF on sensitive Wallet/Stripe webhooks.

## 14. Scalability Requirements
- Location searches (PostGIS for Postgres or geohashing) to quickly query tasks by proximity.
- WebSocket / Socket.io horizontally scaled via Redis Pub/Sub if running multiple instances.
- Database connection pooling (PgBouncer) for high concurrency.

## 15. Third-Party Integrations
- **Stripe Connect:** Custom or Express accounts for Taskers (KYC, payouts), Stripe Checkout for Requesters (Deposits).
- **Socket.io:** Real-time chat & notifications.
- **Mapbox or Google Maps API:** Distance calculation and map displays.
- **AWS S3 / Cloud Storage:** Uploading avatars and task images.

## 16. Environment Variables
```env
# App
NODE_ENV=production
PORT=3000
APP_URL=https://helpgram.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/helpgram?pgbouncer=true

# Auth
JWT_SECRET=super_secure_random
JWT_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
```

## 17. Deployment Architecture
- **Web App / API:** Node.js Docker containers hosted on stateless runners.
- **Database:** Managed PostgreSQL with automatic backups.
- **Cache / PubSub:** Managed Redis for Socket.io state and cache.
- **CI/CD:** GitHub Actions building Docker images and validating Prisma schema.

---

## 🚨 Final Architecture Audit & Risks

### 1. Missing Features
- **Booking / Scheduling Conflict:** Currently lacks logic to prevent a Tasker from accepting two identical scheduled tasks concurrently.
- **KYC Compliance:** Stripe handles some KYC, but in-app trust verified ID is missing a provider (e.g. Persona/Jumio).

### 2. Contradictions
- **Trust vs. Open Marketplace:** If the app is fully local/open, scammers might claim tasks. We must enforce Stripe Connect setup *before* a Tasker can accept tasks. This is a friction point but necessary for trust.

### 3. Edge Cases
- **Stale Funds:** Tasker marks "Completed" but Requester never approves/releases escrow.
  - *Mitigation:* Implement an auto-release cron job (e.g., 72 hours after tasker marks complete).
- **Service Theft:** Requester disputes task immediately after tasker finishes to steal service.
  - *Mitigation:* Require pre-task and post-task photo evidence for disputes.

### 4. Security Risks
- **Race conditions in Wallet:** Two rapid withdrawals might double-spend if not safely locked.
  - *Fix:* Must use row-level locking (`SELECT ... FOR UPDATE`) in Postgres when modifying wallet balances.
- **Fake locations:** Users spoofing GPS coordinates to accept out-of-state tasks in high-cost areas.

### 5. Database Issues
- JSON fields for strings or unstructured data will eventually slow down queries. Keep `skills` in a normalized lookup table for quick matching.
- Real-time `distance` sorting across 10k users requires PostGIS; basic formulas in application code will degrade performance rapidly.
