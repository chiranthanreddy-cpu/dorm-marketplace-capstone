# Dorm Marketplace Product Requirements

## 1. Scope Cut

1. **Payments** — Payment processing is scope creep for Day 1 because handoffs can be arranged without money movement.
2. **Real authentication** — Account security is scope creep for Day 1 because a demo-user selector is enough to prove the workflow.
3. **Chat and notifications** — Messaging and push delivery are scope creep for Day 1 because listings and reservations establish the core exchange.

## 2. MVP Features

1. Students can browse, search, filter, and create listings with item details and status.
2. A buyer can claim an available listing, see its reservation countdown, and confirm the in-person handoff.
3. Sellers can mark their own listings sold while the server enforces ownership, availability, expiration, and competing-claim rules.

## 3. Acceptance Criteria

1. **Given** an available listing and a buyer who is not its seller, **When** the buyer claims it, **Then** the server returns success, changes the listing to RESERVED, records the buyer and expiration, and the UI shows a countdown.
2. **Given** one available listing and two buyers, **When** both submit claims concurrently, **Then** exactly one succeeds and the other receives HTTP 409 with a useful conflict message.
3. **Given** a reserved listing whose claim expires or a listing already unavailable, **When** the old buyer attempts to confirm handoff or another buyer attempts to claim, **Then** the server rejects the action and never changes a SOLD listing back to AVAILABLE.
