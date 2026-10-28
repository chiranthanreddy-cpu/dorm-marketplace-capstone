import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '/api';
const categories = ['All', 'Textbooks', 'Appliances', 'Bikes', 'Furniture', 'Electronics'];
const initialForm = { title: '', description: '', price: '', condition: 'Good', category: 'Furniture' };

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function Status({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>;
}

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  if (!remaining) return <span className="countdown">Refreshing availability...</span>;
  const seconds = Math.ceil(remaining / 1000);
  return <span className="countdown">Reserved for {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>;
}

function App() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState('alex');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (quiet = false) => {
    try {
      const data = await api('/items');
      setItems(data.items);
      if (!quiet) setLoading(false);
    } catch (error) { setMessage({ type: 'error', text: error.message }); setLoading(false); }
  };
  useEffect(() => {
    Promise.all([api('/users'), refresh()]).then(([data]) => setUsers(data)).catch((error) => setMessage({ type: 'error', text: error.message }));
    const timer = setInterval(() => refresh(true), 5000);
    return () => clearInterval(timer);
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => (category === 'All' || item.category === category)
    && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [items, category, query]);
  const user = users.find((candidate) => candidate.id === currentUser) || { id: currentUser, name: '' };
  const act = async (path, body, success) => {
    try { await api(path, { method: 'POST', body: JSON.stringify(body) }); setMessage({ type: 'success', text: success }); await refresh(true); }
    catch (error) { setMessage({ type: 'error', text: error.message }); await refresh(true); }
  };
  const createListing = async (event) => {
    event.preventDefault();
    try {
      await api('/items', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), sellerId: user.id, sellerName: user.name }) });
      setForm(initialForm); setMessage({ type: 'success', text: 'Your listing is live.' }); await refresh(true);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
  };

  return <div className="app">
    <header className="hero"><div><p className="eyebrow">Campus exchange</p><h1>Dorm Marketplace</h1><p className="subtitle">Useful things, nearby people, no shipping.</p></div>
      <label className="user-picker">Browsing as<select value={currentUser} onChange={(e) => setCurrentUser(e.target.value)}>{users.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
    </header>
    <main>
      {message && <div className={`notice ${message.type}`} role="alert">{message.text}<button onClick={() => setMessage(null)} aria-label="Dismiss message">×</button></div>}
      <section className="toolbar"><div><h2>Available nearby</h2><p>{visibleItems.length} listing{visibleItems.length === 1 ? '' : 's'} to explore</p></div><input aria-label="Search listings" placeholder="Search listings..." value={query} onChange={(e) => setQuery(e.target.value)} /></section>
      <nav className="filters" aria-label="Categories">{categories.map((name) => <button className={category === name ? 'active' : ''} onClick={() => setCategory(name)} key={name}>{name}</button>)}</nav>
      {loading ? <div className="state">Loading listings...</div> : visibleItems.length === 0 ? <div className="state"><h3>No listings found</h3><p>Try another search or category.</p></div> :
        <div className="grid">{visibleItems.map((item) => <article className="card" key={item.id}><div className="card-top"><span className="category">{item.category}</span><Status status={item.status} /></div><h3>{item.title}</h3><p className="description">{item.description}</p><div className="meta"><strong>${item.price}</strong><span>{item.condition}</span></div><p className="seller">Listed by {item.sellerName}</p>
          {item.claim && <div className="reservation"><Countdown expiresAt={item.claim.expiresAt} /><span>Buyer: {item.claim.buyerName}</span></div>}
          <div className="actions">{item.status === 'AVAILABLE' && item.sellerId !== user.id && <button className="primary" onClick={() => act(`/items/${item.id}/claim`, { buyerId: user.id }, 'Item reserved for you.')}>Claim item</button>}
            {item.status === 'RESERVED' && item.claim?.buyerId === user.id && <button className="primary" onClick={() => act(`/items/${item.id}/confirm`, { buyerId: user.id }, 'Handoff confirmed. Item marked sold.')}>Confirm handoff</button>}
            {item.sellerId === user.id && item.status !== 'SOLD' && <button className="secondary" onClick={() => act(`/items/${item.id}/sold`, { sellerId: user.id }, 'Listing marked sold.')}>Mark as sold</button>}
            {item.status === 'SOLD' && <span className="sold-note">This item is no longer available.</span>}
          </div></article>)}</div>}
      <section className="create"><div><p className="eyebrow">Pass it on</p><h2>List something useful</h2><p>Give another student a great start.</p></div><form onSubmit={createListing}><label>Item title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Description<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-row"><label>Price ($)<input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.slice(1).map((name) => <option key={name}>{name}</option>)}</select></label></div><div className="form-row"><label>Condition<select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option>Like new</option><option>Good</option><option>Used</option></select></label><button className="primary" type="submit">Publish listing</button></div></form></section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
