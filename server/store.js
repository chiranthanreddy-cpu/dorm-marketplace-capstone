const seedItems = [
  { id: 'item-1', title: 'Calculus: Early Transcendentals', description: 'Clean copy with useful margin notes.', price: 35, condition: 'Good', category: 'Textbooks', sellerId: 'maya', sellerName: 'Maya Chen' },
  { id: 'item-2', title: 'Compact Mini Fridge', description: 'Quiet, clean, and fits under a desk.', price: 80, condition: 'Like new', category: 'Appliances', sellerId: 'jordan', sellerName: 'Jordan Lee' },
  { id: 'item-3', title: 'Blue Commuter Bike', description: 'Recently tuned, includes a U-lock.', price: 120, condition: 'Good', category: 'Bikes', sellerId: 'sam', sellerName: 'Sam Rivera' },
  { id: 'item-4', title: 'Ergonomic Desk Chair', description: 'Comfortable chair for long study sessions.', price: 45, condition: 'Used', category: 'Furniture', sellerId: 'maya', sellerName: 'Maya Chen' }
];

class MarketplaceStore {
  constructor({ now = () => Date.now(), reservationSeconds = 30 } = {}) {
    this.now = now;
    this.reservationMs = reservationSeconds * 1000;
    this.items = new Map(seedItems.map((item) => [item.id, { ...item, status: 'AVAILABLE', claim: null }]));
    this.nextId = seedItems.length + 1;
  }

  reconcile() {
    const now = this.now();
    for (const item of this.items.values()) {
      if (item.status === 'RESERVED' && item.claim && item.claim.expiresAt <= now) {
        item.status = 'AVAILABLE';
        item.claim = null;
      }
    }
  }

  list() {
    this.reconcile();
    return [...this.items.values()].map((item) => ({ ...item, claim: item.claim ? { ...item.claim } : null }));
  }

  get(id) {
    this.reconcile();
    return this.items.get(id);
  }

  create(data) {
    const item = {
      id: `item-${this.nextId++}`, title: data.title.trim(), description: data.description.trim(),
      price: Number(data.price), condition: data.condition, category: data.category,
      sellerId: data.sellerId, sellerName: data.sellerName.trim(), status: 'AVAILABLE', claim: null
    };
    this.items.set(item.id, item);
    return item;
  }

  claim(id, buyerId, buyerName) {
    this.reconcile();
    const item = this.items.get(id);
    if (!item) return { error: 'Listing not found', status: 404 };
    if (item.sellerId === buyerId) return { error: 'You cannot claim your own listing', status: 403 };
    if (item.status !== 'AVAILABLE') return { error: `This listing is ${item.status.toLowerCase()}`, status: 409 };
    const expiresAt = this.now() + this.reservationMs;
    item.status = 'RESERVED';
    item.claim = { buyerId, buyerName, expiresAt };
    return { item };
  }

  confirm(id, buyerId) {
    this.reconcile();
    const item = this.items.get(id);
    if (!item) return { error: 'Listing not found', status: 404 };
    if (item.status !== 'RESERVED' || !item.claim) return { error: 'This listing has no active reservation', status: 409 };
    if (item.claim.buyerId !== buyerId) return { error: 'Only the current buyer can confirm handoff', status: 403 };
    item.status = 'SOLD';
    item.claim = null;
    return { item };
  }

  markSold(id, sellerId) {
    this.reconcile();
    const item = this.items.get(id);
    if (!item) return { error: 'Listing not found', status: 404 };
    if (item.sellerId !== sellerId) return { error: 'Only the seller can mark this listing sold', status: 403 };
    if (item.status === 'SOLD') return { error: 'This listing is already sold', status: 409 };
    item.status = 'SOLD';
    item.claim = null;
    return { item };
  }
}

module.exports = { MarketplaceStore };
