# Dorm Marketplace

A small campus marketplace for arranging local, in-person item handoffs. The React/Vite client talks to an Express API that owns the marketplace state and workflow.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:3001`. `RESERVATION_SECONDS` defaults to 30 and can be changed in `.env`.

## Test and build

```bash
npm test
npm run build
```

The Vitest/Supertest suite covers successful and competing claims, unavailable and self-owned listings, deterministic expiration, handoff confirmation, seller overrides, authorization, invalid IDs, and listing validation.

## Architecture and limitations

`server/store.js` is the single source of truth. Claiming is a synchronous check-and-update operation in the shared in-memory store, so concurrent requests cannot both reserve an item. Every relevant operation reconciles expired reservations on the server. A seller override clears a claim and permanently marks the listing sold.

The demo-user selector simulates identity; it is not authentication. State is intentionally in memory: restarting the server resets seed data and all new listings, and multiple server processes do not share state. This is appropriate for the Day 1 challenge but would require a durable database, transactions, and real authentication for production.
