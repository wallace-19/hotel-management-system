// ═══════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════

let stripeInstance = null;
let stripeElements = null;
let stripeCardElement = null;

async function loadAppConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load app configuration');
    S.appConfig = await res.json();
  } catch (error) {
    console.warn('Could not load app config:', error);
  }
}

function initializeStripeElement() {
  if (!window.Stripe) {
    throw new Error('Stripe.js is not loaded');
  }
  if (!S.appConfig || !S.appConfig.stripePublishableKey) {
    throw new Error('Stripe publishable key is not configured');
  }
  if (!stripeInstance) {
    stripeInstance = Stripe(S.appConfig.stripePublishableKey);
  }
  if (!stripeElements) {
    stripeElements = stripeInstance.elements();
  }
  if (stripeCardElement) {
    try {
      stripeCardElement.unmount();
    } catch (e) {
      // ignore unmount errors when element is not mounted
    }
    stripeCardElement = null;
  }

  stripeCardElement = stripeElements.create('card', {
    style: {
      base: {
        color: '#111',
        fontSize: '16px',
        '::placeholder': { color: '#999' }
      },
      invalid: {
        color: '#ff5a5f'
      }
    }
  });
  const mountPoint = document.getElementById('stripe-card-element');
  if (mountPoint) {
    stripeCardElement.mount(mountPoint);
    stripeCardElement.on('change', event => {
      document.getElementById('stripe-card-error').textContent = event.error ? event.error.message : '';
    });
  }
}

async function startStripePayment() {
  if (!S.cart || S.cart.length === 0) {
    toast('Your cart is empty', '⚠');
    return;
  }
  try {
    initializeStripeElement();
  } catch (error) {
    toast(error.message || 'Stripe initialization failed', '⚠');
    return;
  }

  const amount = Math.round(cartTotal() * 100);
  if (amount <= 0) {
    toast('Invalid payment amount', '⚠');
    return;
  }

  try {
    const response = await fetch('/api/payments/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'KES' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create payment intent');

    const result = await stripeInstance.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: stripeCardElement,
        billing_details: {
          name: S.user?.displayName || 'Guest'
        }
      }
    });

    if (result.error) {
      toast(result.error.message || 'Payment failed', '⚠');
      return;
    }

    if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      const order = {
        id: genOrderId(),
        tableId: S.tableId,
        status: 'paid',
        items: S.cart,
        payment: 'stripe',
        payRef: result.paymentIntent.id,
        total: cartTotal(),
        time: Date.now(),
        note: ''
      };
      S.orders.push(order);
      S.currentOrderId = order.id;
      updateTableStatus();
      saveState();
      toast('Payment successful!', '✓');
      navigate('customer-receipt');
    } else {
      toast('Payment processing, please wait', '⚠');
    }
  } catch (error) {
    console.error('Stripe payment error:', error);
    toast(error.message || 'Stripe payment failed', '⚠');
  }
}

function selectTable(id) {
  const t = S.tables.find(t => t.id === id);
  if (t && t.status === 'occupied') {
    toast('This table already has an active order', '⚠');
    return;
  }
  S.tableId = id;
  S.cart = [];
  navigate('customer-menu');
}

function setCategory(cat) {
  S.activeCategory = cat;
  render();
}

function addToCart(itemId) {
  const item = S.menu.find(m => m.id === itemId);
  if (!item) return;
  const inCart = S.cart.find(c => c.id === itemId);
  if (inCart) {
    inCart.qty++;
  } else {
    S.cart.push({ ...item, qty: 1 });
  }
  toast(item.name + ' added', '✓');
  render();
}

function changeQty(itemId, change) {
  const item = S.cart.find(c => c.id === itemId);
  if (item) {
    item.qty += change;
    if (item.qty <= 0) {
      S.cart = S.cart.filter(c => c.id !== itemId);
      render();
      return;
    }
  }
  render();
}

function removeFromCart(itemId) {
  S.cart = S.cart.filter(c => c.id !== itemId);
  toast('Item removed', '🗑');
  render();
}

function startMpesa() {
  const phone = document.getElementById('mpesa-phone')?.value || '';
  if (!phone || phone.length < 10) {
    toast('Enter valid phone number', '⚠');
    return;
  }
  S.mpesaPhone = phone;
  const order = {
    id: genOrderId(),
    tableId: S.tableId,
    status: 'pending',
    items: S.cart,
    payment: 'mpesa',
    payRef: '',
    total: cartTotal(),
    time: Date.now(),
    note: ''
  };
  S.orders.push(order);
  S.currentOrderId = order.id;
  updateTableStatus();
  setTimeout(() => {
    order.payRef = genPayRef('mpesa');
    saveState();
    render();
  }, 2000);
  toast('M-Pesa prompt sent!', '✓');
  render();
}

function placeCashOrder() {
  const order = {
    id: genOrderId(),
    tableId: S.tableId,
    status: 'pending',
    items: S.cart,
    payment: 'cash',
    payRef: '',
    total: cartTotal(),
    time: Date.now(),
    note: ''
  };
  S.orders.push(order);
  S.currentOrderId = order.id;
  updateTableStatus();
  toast('Order placed! Staff will confirm payment', '✓');
  navigate('customer-receipt');
}

function verifyCashManually(id) {
  const o = S.orders.find(o => o.id === id);
  if (o) {
    o.payRef = genPayRef('cash');
    navigate('customer-receipt');
  }
}

async function staffSignIn() {
  const email = document.getElementById('staff-email')?.value.trim();
  const password = document.getElementById('staff-password')?.value;
  if (!email || !password) {
    toast('Email and password are required', '⚠');
    return;
  }

  try {
    const res = await fetch('/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Staff login failed');
    }
    S.staffLoggedIn = true;
    S.staffUser = data.staff;
    toast('Logged in as ' + data.staff.full_name, '✓');
    navigate('staff-dashboard');
  } catch (error) {
    toast(error.message || 'Login failed', '❌');
  }
}

// Menu editing functions
function editItem(id) {
  const item = S.menu.find(m => m.id === id);
  if (item) {
    S.editingItem = item;
    render();
  }
}

function saveEditItem() {
  if (!S.editingItem || !S.editingItem.name.trim()) return toast('Please fill all fields', '⚠');
  (async () => {
    try {
      const res = await fetch(`/api/menu/${S.editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(S.editingItem)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      const idx = S.menu.findIndex(x => x.id === j.id);
      if (idx >= 0) S.menu[idx] = j;
      toast('Item updated', '✓');
      S.editingItem = null;
      render();
    } catch (e) {
      console.error(e);
      toast('Failed to update item', '⚠');
    }
  })();
}

function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  (async () => {
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      S.menu = S.menu.filter(m => m.id !== id);
      toast('Item deleted', '🗑');
      render();
    } catch (e) {
      console.error(e);
      toast('Failed to delete item', '⚠');
    }
  })();
}

function toggleAvail(id) {
  const m = S.menu.find(m => m.id === id);
  const newVal = !m.avail;
  (async () => {
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avail: newVal })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      const idx = S.menu.findIndex(x => x.id === j.id);
      if (idx >= 0) S.menu[idx] = j;
      toast(j.name + (j.avail ? ' enabled' : ' hidden'), '✓');
      render();
    } catch (e) {
      console.error(e);
      toast('Failed to update item', '⚠');
    }
  })();
}

function openAddItem() {
  S.showAddItem = true;
  render();
}

function closeItemModal() {
  S.showAddItem = false;
  S.editingItem = null;
  render();
}

function saveNewItem() {
  if (!S.newItem.name.trim() || typeof S.newItem.price === 'undefined') return toast('Please fill all fields', '⚠');
  (async () => {
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(S.newItem)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Create failed');
      S.menu.push(j);
      S.newItem = { cat: 'mains', emoji: '🍽️', name: '', desc: '', price: '', avail: true };
      S.showAddItem = false;
      toast('Item added', '✓');
      render();
    } catch (e) {
      console.error(e);
      toast('Failed to add item', '⚠');
    }
  })();
}

async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Failed to fetch menu');
    S.menu = Array.isArray(j) ? j : [];
    render();
  } catch (e) {
    console.error(e);
    toast('Could not load menu', '⚠');
  }
}

function toggleServed() {
  S._showServed = !S._showServed;
  render();
}

function proceedToCheckout() {
  navigate('customer-checkout');
}

// Add Tables Functions
function openAddTablesModal() {
  S.showAddTables = true;
  S.numTablesToAdd = 1;
  render();
}

function closeAddTablesModal() {
  S.showAddTables = false;
  S.numTablesToAdd = 1;
  render();
}

function addTables() {
  const num = Number(S.numTablesToAdd);
  if (num < 1 || num > 100) {
    toast('Enter a number between 1 and 100', '⚠');
    return;
  }
  
  const currentMaxId = Math.max(...S.tables.map(t => t.id), 0);
  for (let i = 0; i < num; i++) {
    const newId = currentMaxId + i + 1;
    S.tables.push({
      id: newId,
      name: `Table ${newId}`,
      status: 'free'
    });
  }
  
  saveState();
  toast(`${num} table(s) added successfully!`, '✓');
  S.showAddTables = false;
  render();
}

// Delete Table Function
function deleteTable(tableId) {
  const table = S.tables.find(t => t.id === tableId);
  if (!table) {
    toast('Table not found', '⚠');
    return;
  }
  
  // Check if table has active orders
  const activeOrder = S.orders.find(o => o.tableId === tableId && ['pending', 'preparing', 'ready'].includes(o.status));
  if (activeOrder) {
    toast('Cannot delete table with active order', '⚠');
    return;
  }
  
  // Confirm deletion
  if (!confirm(`Delete Table ${tableId}? This action cannot be undone.`)) {
    return;
  }
  
  // Remove table
  S.tables = S.tables.filter(t => t.id !== tableId);
  
  saveState();
  toast(`Table ${tableId} deleted`, '✓');
  render();
}
