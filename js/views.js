// ═══════════════════════════════════════
// VIEW RENDERING FUNCTIONS
// ═══════════════════════════════════

function viewLanding() {
  return `
  <div class="landing-hero fade-in">
    <div class="landing-ornament">🏨</div>
    <h1 class="landing-title">Zawai Hotel</h1>
    <p class="landing-sub font-display" style="font-style:italic;font-size:16px">World's Finest Dining Experience</p>
    <div class="landing-cards">
      <div class="landing-card" onclick="navigate('table-select')">
        <div class="landing-card-icon">🪑</div>
        <div>
          <div class="landing-card-title">I'm a Guest</div>
          <div class="landing-card-desc">Browse menu, place order & pay from your phone</div>
        </div>
        <div style="color:var(--gold);font-size:18px;margin-left:auto">›</div>
      </div>
      <div class="landing-card" onclick="navigate('auth-login')">
        <div class="landing-card-icon">🔐</div>
        <div>
          <div class="landing-card-title">Customer Login</div>
          <div class="landing-card-desc">Sign in or create an account to save bookings</div>
        </div>
        <div style="color:var(--gold);font-size:18px;margin-left:auto">›</div>
      </div>
      <div class="landing-card" onclick="navigate('staff-login')">
        <div class="landing-card-icon">👨‍💼</div>
        <div>
          <div class="landing-card-title">Staff Access</div>
          <div class="landing-card-desc">Orders dashboard, kitchen management & settings</div>
        </div>
        <div style="color:var(--gold);font-size:18px;margin-left:auto">›</div>
      </div>
    </div>
    <p style="font-size:11px;color:var(--cream-dim);margin-top:30px;text-align:center">
      Powered by <span style="color:var(--gold);font-weight:700">Zawai POS v2.0</span>
    </p>
  </div>`;
}

function viewAuthPage() {
  const isSignup = S.authMode === 'signup';
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('landing')">←</div>
    <div><div class="topbar-logo">Customer Login</div><div class="topbar-sub">Firebase authentication for guests</div></div>
    <div class="topbar-spacer"></div>
    ${S.isAuthenticated ? `<button class="btn btn-ghost btn-sm" onclick="signOutUser()">Logout</button>` : ''}
  </div>
  <div class="fade-in" style="padding:20px">
    <div class="auth-tabs" style="display:flex;gap:10px;margin-bottom:20px">
      <button class="btn ${S.authMode === 'signin' ? 'btn-gold' : 'btn-outline'} btn-full" onclick="switchAuthMode('signin')">Sign In</button>
      <button class="btn ${S.authMode === 'signup' ? 'btn-gold' : 'btn-outline'} btn-full" onclick="switchAuthMode('signup')">Sign Up</button>
    </div>
    <form onsubmit="submitAuthForm(event)">
      ${isSignup ? `
      <label class="form-label">Name</label>
      <input id="auth-fullname" class="form-input" type="text" placeholder="Full name" required />
      ` : ''}
      <label class="form-label">Email</label>
      <input id="auth-email" class="form-input" type="email" placeholder="you@example.com" required />
      <label class="form-label">Password</label>
      <input id="auth-password" class="form-input" type="password" placeholder="Password" required />
      ${!isSignup ? `
      <div style="text-align:right;margin-top:8px">
        <a href="#" onclick="forgotPassword();return false;" style="font-size:13px;color:var(--gold)">Forgot password?</a>
      </div>
      ` : ''}
      <button class="btn btn-gold btn-full" type="submit">${isSignup ? 'Create account' : 'Sign in'}</button>
    </form>
  </div>`;
}

function viewTableSelect() {
  const grid = S.tables.map(t => {
    const order = S.orders.find(o => o.tableId === t.id && ['pending', 'preparing', 'ready'].includes(o.status));
    return `
    <div class="table-btn ${t.status === 'occupied' ? 'occupied' : ''}" onclick="selectTable(${t.id})">
      <div class="table-num">${t.id}</div>
      <div class="tbl-status">${t.status === 'occupied' ? '🔴 Busy' : '🟢 Free'}</div>
    </div>`;
  }).join('');
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('landing')">←</div>
    <div><div class="topbar-logo">Select Your Table</div><div class="topbar-sub">Scan QR or tap your table number</div></div>
  </div>
  <div class="fade-in">
    <div class="section-label">📍 Restaurant Floor — ${S.tables.filter(t => t.status === 'occupied').length} of ${S.tables.length} tables occupied</div>
    <div class="table-grid">${grid}</div>
  </div>`;
}

function viewCustomerMenu() {
  const cats = [
    { id: 'all', label: 'All ✨' },
    { id: 'starters', label: '🫔 Starters' },
    { id: 'mains', label: '🍛 Mains' },
    { id: 'grills', label: '🔥 Grills' },
    { id: 'drinks', label: '🥤 Drinks' },
    { id: 'desserts', label: '🍩 Desserts' },
  ];
  const catPills = cats.map(c => `
    <div class="cat-pill ${S.activeCategory === c.id ? 'active' : ''}" onclick="setCategory('${c.id}')">${c.label}</div>
  `).join('');
  const filtered = S.activeCategory === 'all' ? S.menu : S.menu.filter(m => m.cat === S.activeCategory);
  const items = filtered.filter(m => m.avail).map(m => {
    const inCart = S.cart.find(c => c.id === m.id);
    const ctrl = inCart
      ? `<div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${m.id},-1)">−</button>
          <span class="qty-num">${inCart.qty}</span>
          <button class="qty-btn" onclick="changeQty(${m.id},1)">+</button>
        </div>`
      : `<div class="add-btn" onclick="addToCart(${m.id})">+ Add</div>`;
    return `
    <div class="menu-item">
      <div class="menu-emoji">${m.emoji}</div>
      <div class="menu-info">
        <div class="menu-name">${esc(m.name)}</div>
        <div class="menu-desc">${esc(m.desc)}</div>
        <div class="menu-price">${fmt(m.price)} <span>per item</span></div>
      </div>
      ${ctrl}
    </div>`;
  }).join('');
  const cc = cartCount();
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('table-select')">←</div>
    <div><div class="topbar-logo">Table ${S.tableId} — Menu</div><div class="topbar-sub">Zawai Hotel</div></div>
    <div class="topbar-spacer"></div>
    ${cc > 0 ? `<div class="btn btn-gold btn-sm" onclick="navigate('customer-cart')" style="gap:6px">🛒 <div class="badge-cart" style="background:#0d0900;color:var(--gold)">${cc}</div></div>` : ''}
  </div>
  <div class="fade-in">
    <div class="menu-categories">${catPills}</div>
    <div class="menu-list">${items}</div>
  </div>`;
}

function viewCustomerCart() {
  const items = S.cart.map(item => {
    const menu = S.menu.find(m => m.id === item.id);
    return `
    <div class="cart-item">
      <div class="cart-emoji">${item.emoji}</div>
      <div class="cart-info">
        <div class="cart-name">${esc(item.name)}</div>
        <div class="cart-price">${fmt(item.price)} × ${item.qty}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:700;color:var(--gold)">${fmt(item.price * item.qty)}</div>
        <div class="cart-remove" onclick="removeFromCart(${item.id})">🗑</div>
      </div>
    </div>`;
  }).join('');
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('customer-menu')">←</div>
    <div><div class="topbar-logo">Your Cart</div><div class="topbar-sub">Table ${S.tableId}</div></div>
  </div>
  <div class="fade-in" style="padding:16px 20px 100px">
    ${S.cart.length > 0 ? `
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">${items}</div>
      <div class="card" style="text-align:left;margin-bottom:20px">
        <div class="totals-row"><span>Subtotal</span><span>${fmt(cartTotal())}</span></div>
        <div class="totals-row"><span>Service Fee</span><span>Free</span></div>
        <div class="totals-row total"><span>Total</span><span class="totals-total">${fmt(cartTotal())}</span></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-full" onclick="navigate('customer-menu')">Add More</button>
        <button class="btn btn-gold btn-full" onclick="navigate('customer-checkout')">Checkout</button>
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <div class="empty-text">Your cart is empty</div>
        <div class="empty-sub">Add items from the menu to get started</div>
        <button class="btn btn-gold btn-sm" style="margin-top:20px" onclick="navigate('customer-menu')">Back to Menu</button>
      </div>
    `}
  </div>`;
}

function viewCustomerCheckout() {
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('customer-cart')">←</div>
    <div><div class="topbar-logo">Payment Method</div><div class="topbar-sub">Table ${S.tableId}</div></div>
  </div>
  <div class="fade-in" style="padding:40px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <div style="font-size:48px;margin-bottom:16px">💳</div>
      <h2 style="margin-bottom:6px">Choose Payment</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Quick & Secure</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;max-width:380px;margin:0 auto">
      ${S.appConfig?.stripeEnabled ? `
      <div class="pay-card" onclick="navigate('customer-stripe')">
        <div class="pay-icon">💳</div>
        <div class="pay-title">Card</div>
        <div class="pay-desc">Pay securely with card</div>
      </div>
      ` : `
      <div class="pay-card pay-card-disabled">
        <div class="pay-icon">💳</div>
        <div class="pay-title">Card</div>
        <div class="pay-desc">Card payments not enabled</div>
      </div>
      `}
      <div class="pay-card" onclick="navigate('customer-mpesa')">
        <div class="pay-icon">📱</div>
        <div class="pay-title">M-Pesa</div>
        <div class="pay-desc">Instant payment via phone</div>
      </div>
      <div class="pay-card" onclick="navigate('customer-cash')">
        <div class="pay-icon">💵</div>
        <div class="pay-title">Cash</div>
        <div class="pay-desc">Pay at table or counter</div>
      </div>
    </div>
  </div>`;
}

function viewCustomerStripe() {
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('customer-checkout')">←</div>
    <div><div class="topbar-logo">Card Payment</div></div>
  </div>
  <div class="fade-in" style="padding:40px 20px;max-width:420px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:60px;margin-bottom:16px">💳</div>
      <h2 style="margin-bottom:6px">Pay with Card</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Secure payment powered by Stripe</p>
    </div>
    <div class="card" style="text-align:left;margin-bottom:20px">
      <div class="totals-row"><span>Total Amount</span><span style="font-weight:700">${fmt(cartTotal())}</span></div>
    </div>
    ${S.appConfig?.stripeEnabled ? `
    <div class="card" style="padding:20px 16px;margin-bottom:16px">
      <div id="stripe-card-element"></div>
      <div id="stripe-card-error" style="color:#ff5a5f;margin-top:12px;font-size:13px;"></div>
    </div>
    <button class="btn btn-gold btn-full" onclick="startStripePayment()">Pay ${fmt(cartTotal())}</button>
    ` : `
    <div class="card" style="padding:20px 16px;margin-bottom:16px;color:var(--cream-dim);font-size:14px;text-align:center">
      Card payments are not configured. Please enable Stripe or use another method.
    </div>
    `}
    <p style="font-size:11px;color:var(--cream-dim);margin-top:16px;text-align:center">You will be prompted to complete your card payment securely.</p>
  </div>`;
}

function viewCustomerMpesa() {
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('customer-checkout')">←</div>
    <div><div class="topbar-logo">M-Pesa Payment</div></div>
  </div>
  <div class="fade-in" style="padding:40px 20px;max-width:380px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:60px;margin-bottom:16px">📱</div>
      <h2 style="margin-bottom:6px">Enter Phone Number</h2>
      <p style="font-size:13px;color:var(--cream-dim)">We'll send M-Pesa prompt to your phone</p>
    </div>
    <input type="tel" id="mpesa-phone" placeholder="0712345678" value="${S.mpesaPhone}" style="margin-bottom:20px" />
    <div class="card" style="text-align:left;margin-bottom:20px">
      <div class="totals-row"><span>Total Amount</span><span style="font-weight:700">${fmt(cartTotal())}</span></div>
    </div>
    <button class="btn btn-gold btn-full" onclick="startMpesa()">Send M-Pesa Prompt</button>
    <p style="font-size:11px;color:var(--cream-dim);margin-top:16px;text-align:center">Secure payment via Safaricom M-Pesa</p>
  </div>`;
}

function viewCustomerCash() {
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('customer-checkout')">←</div>
    <div><div class="topbar-logo">Cash Payment</div></div>
  </div>
  <div class="fade-in" style="padding:40px 20px;max-width:380px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:60px;margin-bottom:16px">💵</div>
      <h2 style="margin-bottom:6px">Place Your Order</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Our staff will bring the bill to your table</p>
    </div>
    <div class="card" style="text-align:left;margin-bottom:20px">
      <div class="totals-row"><span>Total Amount</span><span style="font-weight:700">${fmt(cartTotal())}</span></div>
      <div class="totals-row"><span style="font-size:11px;color:var(--cream-dim)">Payment due at table</span></div>
    </div>
    <button class="btn btn-gold btn-full" onclick="placeCashOrder()">Place Order Now</button>
    <p style="font-size:11px;color:var(--cream-dim);margin-top:16px;text-align:center">A confirmation will be sent to your table shortly</p>
  </div>`;
}

function viewCustomerReceipt() {
  const order = S.orders.find(o => o.id === S.currentOrderId);
  if (!order) return navigate('landing');
  return `
  <div class="topbar">
    <div><div class="topbar-logo">Order Confirmed! 🎉</div><div class="topbar-sub">Table ${S.tableId}</div></div>
  </div>
  <div class="fade-in" style="padding:24px 20px">
    <div style="text-align:center;margin-bottom:20px">
      <div class="status-circle green">✓</div>
      <h2 style="margin-bottom:4px">Order Received!</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Our kitchen has been notified. Sit back & relax.</p>
    </div>
    <div class="receipt">
      <div class="receipt-header">
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--gold)">Zawai Hotel</div>
        <div style="font-size:12px;color:var(--cream-dim);margin-top:4px">Table ${order.tableId} · ${new Date(order.time).toLocaleTimeString()}</div>
      </div>
      ${order.items.map(i => `<div class="receipt-row"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join('')}
      <div class="receipt-row total"><span>TOTAL</span><span>${fmt(order.total)}</span></div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(212,146,10,.2)">
        <div class="receipt-row"><span>Payment</span><span style="text-transform:capitalize">${order.payment === 'mpesa' ? '📱 M-Pesa' : order.payment === 'stripe' ? '💳 Card' : '💵 Cash'}</span></div>
        ${order.payRef ? `<div class="receipt-row"><span>Ref</span><span style="font-size:11px;color:var(--gold)">${order.payRef}</span></div>` : ''}
      </div>
      <div class="receipt-id">Order ID: ${order.id}</div>
    </div>
    <div style="padding:20px 0 40px;display:flex;flex-direction:column;gap:10px">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px">
        <div style="font-size:28px">⏱️</div>
        <div>
          <div style="font-size:13px;font-weight:700;margin-bottom:2px">Estimated Wait</div>
          <div style="font-size:12px;color:var(--cream-dim)">15–25 minutes depending on items ordered</div>
        </div>
      </div>
      <button class="btn btn-outline btn-full" onclick="navigate('customer-menu',{tableId:S.tableId,cart:[]})">Order More Items</button>
      <button class="btn btn-ghost btn-full" onclick="navigate('landing')">Done</button>
    </div>
  </div>`;
}
