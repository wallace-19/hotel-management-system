// ═══════════════════════════════════════
// UTILITIES & HELPERS
// ═══════════════════════════════════════

function fmt(n) {
  return 'KES ' + Number(n).toLocaleString();
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? 'Just now' : m === 1 ? '1 min ago' : m + 'm ago';
}

function genOrderId() {
  let id;
  do {
    id = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100);
  } while (S.orders.some(o => o.id === id));
  return id;
}

function genPayRef(type) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = () => chars[Math.floor(Math.random() * chars.length)];
  return type === 'mpesa' ? 'MPESA-' + r() + r() + r() + r() + r() : 'CASH-' + r() + r() + r() + r();
}

function cartTotal() {
  return S.cart.reduce((a, i) => a + i.price * i.qty, 0);
}

function cartCount() {
  return S.cart.reduce((a, i) => a + i.qty, 0);
}

function statusColor(s) {
  return {
    pending: 'tag-amber',
    preparing: 'tag-blue',
    ready: 'tag-green',
    served: 'tag-gray',
    cancelled: 'tag-red'
  }[s] || 'tag-gray';
}

function statusLabel(s) {
  return {
    pending: '⏳ Pending',
    preparing: '👨‍🍳 Preparing',
    ready: '✅ Ready',
    served: '🍽️ Served',
    cancelled: '✗ Cancelled'
  }[s] || s;
}

function toast(msg, emoji = '✓') {
  const t = document.getElementById('toast');
  t.textContent = emoji + ' ' + msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2500);
}

function navigate(view, params = {}) {
  if (!S.isAuthenticated && view !== 'auth-login') {
    S.view = 'auth-login';
    render();
    document.getElementById('app').scrollTo(0, 0);
    return;
  }

  if (!S.staffLoggedIn && view.startsWith('staff-') && view !== 'staff-login') {
    S.view = 'staff-login';
    render();
    document.getElementById('app').scrollTo(0, 0);
    return;
  }

  Object.assign(S, params);
  S.view = view;
  render();
  document.getElementById('app').scrollTo(0, 0);
}

function tableUrl(id) {
  return `${location.origin}${location.pathname}?table=${encodeURIComponent(id)}`;
}

function getTopItems() {
  const items = {};
  S.orders.forEach(order => {
    order.items.forEach(item => {
      if (!items[item.id]) {
        items[item.id] = { ...item, qty: 0, revenue: 0 };
      }
      items[item.id].qty += item.qty;
      items[item.id].revenue += item.price * item.qty;
    });
  });
  return Object.values(items)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
