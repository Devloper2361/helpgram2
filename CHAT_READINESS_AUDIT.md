# Phase 6: Communication System Readiness Audit

## Analysis of Current State vs Requirements

**1. Thread Creation Rules**
* **Current State**: `MessageThread` has a `taskId @unique` constraint. This signifies only one thread exists per task.
* **Validation**: This means chat is strictly allowed *after* a helper is selected. If the platform intends to allow requesters to chat with multiple applicants *before* selection, the `@unique` constraint on `taskId` will block it.
* **Risk Level**: Medium risk depending on intended product flow. If post-acceptance chat only, it is perfectly constrained.

**2. Message Authorization Rules**
* **Current State**: `MessageThread` binds to `requesterId` and `taskerId`.
* **Security Risk**: Application-level logic must explicitly verify `req.user.userId === thread.requesterId || req.user.userId === thread.taskerId`.
* **Risk Level**: High. Lacking this check on GET/POST routes introduces an Insecure Direct Object Reference (IDOR) vulnerability.

**3. Attachment Support**
* **Current State**: `MessageType` enum supports `IMAGE`, but `Message` does not hold a foreign key to `MediaAttachment`. `MediaAttachment` only links to `Task`.
* **Limitation**: Files sent in chat will either need their raw URL stored in `Message.content`, or we lack formal foreign key tracking for message attachments.
* **Recommended Fix**: Add a nullable `attachmentId` to `Message` that links to `MediaAttachment`, or just rely on passing the CDN URL directly in `content` for `IMAGE` types.

**4. Read Receipts & 5. Unread Counts**
* **Current State**: `Message` has `isRead Boolean @default(false)`.
* **Performance Risk**: To get the global "Unread Messages Badge" count on a user's dashboard, we must query all messages across all threads where `senderId != currentUserId` and `isRead == false`. This requires a JOIN through `MessageThread`.
* **Recommended Fix**: Add a `recipientId` directly to the `Message` table so we can index and query: `SELECT count(*) FROM Message WHERE recipientId = ? AND isRead = false`. Alternatively, store denormalized `requesterUnreadCount` and `taskerUnreadCount` directly on `MessageThread`.

**6. Message Pagination**
* **Current State**: `Message` has `@@index([threadId, createdAt(sort: Desc)])`.
* **Status**: ✅ Excellent. This supports highly efficient keyset (cursor) pagination for loading message history incrementally.

**7. Notification Integration**
* **Current State**: `Notification` model handles arbitrary alerts (`relatedEntityId`), indexed perfectly via `@@index([userId, isRead, createdAt(sort: Desc)])`.
* **Status**: ✅ Ready for integration.

---

## Required Database Enhancements (Pre-Implementation)

**1. Inbox Sorting Indexes (Missing)**
* Users need to see their threads sorted by the most recent message. `MessageThread` has `updatedAt`, but no composite index to sort efficiently.
* **Missing**: `@@index([requesterId, updatedAt(sort: Desc)])` and `@@index([taskerId, updatedAt(sort: Desc)])`.

**2. Recipient Mapping (Missing)**
* Add `recipientId String @db.Uuid` to `Message` along with an index `@@index([recipientId, isRead])` to make global unread badges O(1) index lookups rather than heavy JOINs.

**3. Thread Uniqueness Optimization**
* Check if multiple taskers need to chat. If so, `@@unique([taskId])` must become `@@unique([taskId, taskerId])`.

## Required API/Validation Enhancements

* **Empty Messages**: Must use Zod `z.string().trim().min(1)` to block blank messages.
* **Self-Chat Prevention**: Add `CHECK (requesterId != taskerId)` to avoid a user somehow matching both sides of a thread.
* **Idempotency/Throttle**: Ensure rapid message bursts from the same user are rate-limited.
