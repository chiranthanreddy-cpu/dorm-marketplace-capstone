import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createApp } = require('../server/app');
const { MarketplaceStore } = require('../server/store');

describe('marketplace workflow', () => {
  let now, app;
  beforeEach(() => {
    now = 1_000_000;
    app = createApp({ store: new MarketplaceStore({ now: () => now, reservationSeconds: 30 }) });
  });

  it('claims successfully and records a reservation', async () => {
    const response = await request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' });
    expect(response.status).toBe(200);
    expect(response.body.item.status).toBe('RESERVED');
    expect(response.body.item.claim.buyerId).toBe('jordan');
  });
  it('allows exactly one winner for simultaneous claims', async () => {
    const [a, b] = await Promise.all([
      request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' }),
      request(app).post('/api/items/item-1/claim').send({ buyerId: 'sam' })
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
  it('rejects unavailable items and self-claims', async () => {
    await request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' });
    expect((await request(app).post('/api/items/item-1/claim').send({ buyerId: 'sam' })).status).toBe(409);
    expect((await request(app).post('/api/items/item-1/claim').send({ buyerId: 'maya' })).status).toBe(403);
  });
  it('restores availability when a reservation expires', async () => {
    await request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' });
    now += 30_001;
    expect((await request(app).get('/api/items')).body.items.find((i) => i.id === 'item-1').status).toBe('AVAILABLE');
  });
  it('confirms before expiry but rejects expired claims', async () => {
    await request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' });
    expect((await request(app).post('/api/items/item-1/confirm').send({ buyerId: 'jordan' })).status).toBe(200);
    await request(app).post('/api/items/item-2/claim').send({ buyerId: 'maya' });
    now += 30_001;
    expect((await request(app).post('/api/items/item-2/confirm').send({ buyerId: 'maya' })).status).toBe(409);
  });
  it('seller override cancels a reservation and sold stays sold', async () => {
    await request(app).post('/api/items/item-1/claim').send({ buyerId: 'jordan' });
    expect((await request(app).post('/api/items/item-1/sold').send({ sellerId: 'maya' })).status).toBe(200);
    now += 30_001;
    expect((await request(app).get('/api/items')).body.items.find((i) => i.id === 'item-1').status).toBe('SOLD');
  });
  it('rejects non-owner sold actions and invalid IDs', async () => {
    expect((await request(app).post('/api/items/item-1/sold').send({ sellerId: 'jordan' })).status).toBe(403);
    expect((await request(app).post('/api/items/missing/claim').send({ buyerId: 'jordan' })).status).toBe(404);
  });
  it('validates listing creation', async () => {
    expect((await request(app).post('/api/items').send({ title: 'Missing data' })).status).toBe(400);
    const response = await request(app).post('/api/items').send({ title: 'Lamp', description: 'Desk lamp', price: 12, condition: 'Good', category: 'Furniture', sellerId: 'alex', sellerName: 'Alex Patel' });
    expect(response.status).toBe(201);
  });
});
