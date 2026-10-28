const express = require('express');
const cors = require('cors');
const { MarketplaceStore } = require('./store');

const users = {
  maya: 'Maya Chen', jordan: 'Jordan Lee', sam: 'Sam Rivera', alex: 'Alex Patel'
};

function requiredString(value) { return typeof value === 'string' && value.trim().length > 0; }
function validateListing(body) {
  const fields = ['title', 'description', 'condition', 'category', 'sellerId', 'sellerName'];
  if (fields.some((field) => !requiredString(body[field]))) return 'All text fields are required';
  if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0) return 'Price must be a non-negative number';
  if (!users[body.sellerId]) return 'Select a valid demo seller';
  return null;
}

function createApp({ store = new MarketplaceStore({ reservationSeconds: Number(process.env.RESERVATION_SECONDS) || 30 }) } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/users', (_req, res) => res.json(Object.entries(users).map(([id, name]) => ({ id, name }))));
  app.get('/api/items', (_req, res) => res.json({ items: store.list() }));
  app.post('/api/items', (req, res) => {
    const error = validateListing(req.body);
    if (error) return res.status(400).json({ error });
    return res.status(201).json({ item: store.create(req.body) });
  });

  function action(handler) {
    return (req, res) => {
      try {
        const result = handler(req);
        if (result.error) return res.status(result.status).json({ error: result.error });
        return res.json({ item: result.item });
      } catch (error) {
        return res.status(500).json({ error: 'Unable to update this listing' });
      }
    };
  }
  app.post('/api/items/:id/claim', action((req) => {
    if (!requiredString(req.body.buyerId) || !users[req.body.buyerId]) return { error: 'Select a valid demo buyer', status: 400 };
    return store.claim(req.params.id, req.body.buyerId, users[req.body.buyerId]);
  }));
  app.post('/api/items/:id/confirm', action((req) => {
    if (!requiredString(req.body.buyerId)) return { error: 'Buyer is required', status: 400 };
    return store.confirm(req.params.id, req.body.buyerId);
  }));
  app.post('/api/items/:id/sold', action((req) => {
    if (!requiredString(req.body.sellerId)) return { error: 'Seller is required', status: 400 };
    return store.markSold(req.params.id, req.body.sellerId);
  }));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  return app;
}

module.exports = { createApp };
