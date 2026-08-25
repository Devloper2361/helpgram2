# HelpGram MVP Build Order

This sequence is optimized for a solo founder. It layers complexity chronologically so you never have to build a feature that breaks because its foundational dependency is missing.

---

## Phase 1: Foundation & Authentication
**Goal:** Establish the core infrastructure, database connection, and secure user sessions.
* **Database tables:** `users`, `sessions` (if using token blacklisting)
* **API routes:** 
  * `POST /api/auth/register`
  * `POST /api/auth/login`
  * `POST /api/auth/logout`
  * `GET /api/auth/me`
* **Frontend pages:** `/auth/login`, `/auth/register`
* **Components:** `AuthForm`, `Button`, `Input`, `Label`
* **External services:** PostgreSQL (Supabase/Neon), Prisma ORM
* **Testing checklist:**
  * [ ] User can register and password is hashed.
  * [ ] User cannot register with an existing email.
  * [ ] Login returns a valid JWT (HttpOnly cookie).
* **Dependencies:** None.

---

## Phase 2: Profiles & Skills Mapping
**Goal:** Allow users to establish their identity, trust metrics, and service offerings.
* **Database tables:** `profiles`, `skills`
* **API routes:**
  * `PUT /api/profiles/me`
  * `GET /api/profiles/:userId`
  * `POST /api/skills`
  * `DELETE /api/skills/:skillId`
* **Frontend pages:** `/profile/edit`, `/profile/:id`
* **Components:** `AvatarUpload`, `SkillBadgeList`, `BioInput`
* **External services:** AWS S3 / CloudFlare R2 (for Avatar uploads).
* **Testing checklist:**
  * [ ] User can upload an avatar safely.
  * [ ] User can add/remove up to 10 skills.
  * [ ] Public profile is readable by other authenticated users.
* **Dependencies:** Phase 1 (Auth).

---

## Phase 3: The Task Marketplace Core
**Goal:** Build the engine for requesters to post work and for taskers to search for it.
* **Database tables:** `tasks`, `task_images`
* **API routes:**
  * `POST /api/tasks` (Create)
  * `GET /api/tasks` (List/Search with Pagination & Distance filters)
  * `GET /api/tasks/:id`
  * `PUT /api/tasks/:id` (Edit - only if status is OPEN)
  * `DELETE /api/tasks/:id` (Cancel - only if status is OPEN)
* **Frontend pages:** `/tasks`, `/tasks/new`, `/tasks/:id`
* **Components:** `TaskCard`, `TaskForm`, `MapPreview`, `FilterSidebar`
* **External services:** Mapbox API / Google Maps (Geocoding & Distance Matrices), PostGIS (for spatial DB queries).
* **Testing checklist:**
  * [ ] Tasks validate coordinates properly on creation.
  * [ ] Task search cleanly filters within a 10-mile radius.
  * [ ] Only the requester can delete/edit their open task.
* **Dependencies:** Phase 2 (Profiles).

---

## Phase 4: Financial Core (Stripe & Wallets)
**Goal:** Enable secure fiat deposits, Payout routing, and user ledger balances.
* **Database tables:** `wallets`, `transactions`
* **API routes:**
  * `GET /api/wallet/balance`
  * `POST /api/wallet/stripe-onboard` (Taskers)
  * `POST /api/wallet/deposit` (Requesters via Checkout)
  * `POST /api/wallet/withdraw` (Taskers via Payouts)
  * `POST /api/webhooks/stripe` (Listen for payment success)
* **Frontend pages:** `/wallet`, `/wallet/deposit`, `/wallet/withdraw`
* **Components:** `BalanceCard`, `TransactionHistory`, `StripeConnectBanner`
* **External services:** Stripe (Connect, Checkout, Webhooks).
* **Testing checklist:**
  * [ ] Tasker can complete Stripe Connect onboarding.
  * [ ] Requester can deposit funds (testmode cards).
  * [ ] Webhook securely updates db `balance_available` and prevents replay attacks.
  * [ ] Database uses Row-Level Locking (`SELECT FOR UPDATE`) on wallet updates.
* **Dependencies:** Phase 1 (Auth).

---

## Phase 5: Escrow & Task Lifecycle
**Goal:** Connect the marketplace to the wallet. Escrow funds upon task acceptance, release upon completion.
* **Database tables:** *(Updates to `tasks` status and `transactions` list)*
* **API routes:**
  * `POST /api/tasks/:id/apply`
  * `POST /api/tasks/:id/accept-tasker` (Locks Escrow)
  * `POST /api/tasks/:id/mark-complete` (Tasker flags finished)
  * `POST /api/tasks/:id/release-funds` (Requester approves -> Escrow Released)
* **Frontend pages:** `/tasks/:id` (Update dynamic action buttons based on state).
* **Components:** `EscrowStatusBadge`, `TaskActionPanel`
* **External services:** None (Internal ledger logic).
* **Testing checklist:**
  * [ ] Accepting a tasker fails if Requester wallet < Task Price.
  * [ ] Task acceptance successfully moves funds from `available` to `escrowed` via DB Transaction.
  * [ ] Task completion successful moves funds to tasker's `available` balance.
* **Dependencies:** Phase 3 (Tasks) + Phase 4 (Wallets).

---

## Phase 6: Real-Time Chat & Notifications
**Goal:** Allow Requester and Tasker to coordinate, and push important alerts.
* **Database tables:** `messages`, `threads`, `notifications`
* **API routes:**
  * `GET /api/chat/:taskId`
  * `POST /api/chat/:taskId` (Fallback for non-WS)
  * `GET /api/notifications`
  * `PUT /api/notifications/read`
* **Frontend pages:** `/chat`, `/chat/:taskId`
* **Components:** `ChatWindow`, `MessageBubble`, `NotificationDropdown`
* **External services:** Socket.io / Pusher (WebSockets), Firebase Cloud Messaging (Push).
* **Testing checklist:**
  * [ ] Messages are securely restricted to the accepted Tasker and Requester.
  * [ ] Notification triggers when task status changes or unread message arrives.
* **Dependencies:** Phase 5 (Lifecycle).

---

## Phase 7: Feedback, Ratings & Trust
**Goal:** Complete the loop and build marketplace trust via reviews.
* **Database tables:** `reviews`, `user_metrics` (Aggregated ratings)
* **API routes:**
  * `POST /api/tasks/:id/reviews` (Only allowed if task is COMPLETED)
  * `GET /api/users/:id/reviews`
* **Frontend pages:** `/tasks/:id/review` (Modal or Page)
* **Components:** `StarRatingSelect`, `ReviewListCard`
* **External services:** None.
* **Testing checklist:**
  * [ ] Prevent duplicate reviews for the same task.
  * [ ] Trust score recalculates appropriately.
* **Dependencies:** Phase 5 (Lifecycle).

---

## Phase 8: Disputes & Admin Engine
**Goal:** Handle the messy reality of physical tasks going wrong.
* **Database tables:** `disputes`, `admin_logs`
* **API routes:**
  * `POST /api/tasks/:id/dispute` (Locks funds from being released)
  * `GET /admin/api/disputes`
  * `POST /admin/api/disputes/:id/resolve` (Refund requester OR Force Payout tasker)
* **Frontend pages:** `/support/dispute/:taskId`, `/admin/disputes`
* **Components:** `DisputeForm`, `AdminDisputeDashboard`, `ChatTranscriptViewer`
* **External services:** None.
* **Testing checklist:**
  * [ ] Opening a dispute stops any auto-release timers.
  * [ ] Admin resolution successfully routes escrow to the correct party.
  * [ ] Admin actions are permanently logged.
* **Dependencies:** Phase 6 (Chat - for transcripts) + Phase 5 (Escrow).

---

## Phase 9: Background Jobs (Crons) & KYC
**Goal:** Automate edge cases and mandate heavy identity verification.
* **Database tables:** `kyc_verifications`
* **API routes:**
  * `POST /api/kyc/initiate`
  * `POST /api/kyc/webhook`
* **Frontend pages:** `/profile/verification`
* **Components:** `KYCStatusBanner`
* **External services:** Persona / Jumio (Identity verification), Node-Cron / Trigger.dev.
* **Testing checklist:**
  * [ ] Cron runs daily: Releasing funds for 'COMPLETED' tasks not approved in 72 hours.
  * [ ] Taskers are blocked from `APPLY` if KYC is unverified.
* **Dependencies:** Phase 8 (Disputes).

---

## Phase 10: Launch, Security & Polish
**Goal:** Lock it down, optimize, and launch.
* **Database tables:** None (Migrations locked).
* **API routes:** Infrastructure routing.
* **Frontend pages:** Loading states, Error boundaries.
* **Components:** Global Error Handler, Toast system polish.
* **External services:** Datadog (APM), Sentry (Error tracking), Cloudflare (WAF/DDoS).
* **Testing checklist:**
  * [ ] End-to-end integration test (Signup -> Post -> Accept -> Escrow -> Complete -> Release).
  * [ ] Rate limiters block bruteforce on `/login`.
  * [ ] SQL injection tests on search bars.
  * [ ] Container load tests.
* **Dependencies:** All prior phases.
