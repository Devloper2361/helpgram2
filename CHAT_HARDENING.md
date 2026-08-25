# Phase 6: Communication System Hardening

## Overview

Applied necessary fixes identified in the Chat Readiness Audit prior to the implementation of the communication system.

## Database Index Hardening

Added critical indexes to `MessageThread` to support efficient inbox fetching and sorting for users:
- `@@index([requesterId, updatedAt(sort: Desc)])`
- `@@index([taskerId, updatedAt(sort: Desc)])`

Verified `Message` indexes:
- `@@index([threadId, createdAt(sort: Desc)])` correctly allows keyset pagination for fetching messages efficiently.
- As requested, no `recipientId` has been added. `recipientId` must be derived explicitly during fetch using the thread participants and the current user's ID.

## Security & IDOR Protection Strategy

Implemented a specialized `authorizeChatAccess` helper located in `/src/lib/chatAuth.ts` which provides the following protections:

### 1. Insecure Direct Object Reference (IDOR) Prevention
- Validates that the active session user strictly belongs to the task (is either `requesterId` or `taskerId`).
- A user fetching or submitting messages with a valid Thread ID or Task ID will be immediately rejected if their session ID does not match the active participants.

### 2. Task Lifecycle Check
- Checks that the task actually has a selected helper (`taskerId != null`). Attempting to chat on an `OPEN` task without an assigned helper will explicitly fail.

### 3. Verification Consistency
- Will cross-check `MessageThread` requester/tasker IDs against `Task` requester/tasker IDs to ensure system consistency.

## Next Steps
The database layer and security boundary are now fully ready for Phase 6 API endpoint generation and real-time integration (if applicable). No chat logic has been implemented yet per constraints.
