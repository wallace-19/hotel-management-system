// ═══════════════════════════════════════
// STAFF VIEWS & HANDLERS
// ═══════════════════════════════════════

function viewStaffLogin() {
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('landing')">←</div>
    <div><div class="topbar-logo">Staff Login</div></div>
  </div>
  <div class="fade-in" style="padding:40px 24px;max-width:420px;margin:0 auto">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:52px;margin-bottom:12px">👨‍💼</div>
      <h2 style="margin-bottom:6px">Staff Sign In</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Enter your staff email and password</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <input id="staff-email" class="form-input" type="email" placeholder="Staff email" autocomplete="username" />
      <input id="staff-password" class="form-input" type="password" placeholder="Password" autocomplete="current-password" />
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-gold btn-full" onclick="staffSignIn()">Sign In</button>
        </div>
        <div style="text-align:right;margin-top:8px">
          <a href="#" onclick="staffForgotPassword();return false;" style="font-size:13px;color:var(--gold)">Forgot password?</a>
        </div>
      <p style="text-align:center;font-size:11px;color:var(--cream-dim);margin-top:12px">This login is managed by the admin. Do not use demo credentials.</p>
    </div>
  </div>`;
}

function viewStaffDashboard() {
  const tabs = [
    { id: 'orders', label: '📋 Orders' },
    { id: 'stats', label: '📊 Stats' },
    { id: 'menu', label: '🍛 Menu' },
    { id: 'tables', label: '🪑 Tables' },
  ];
  const tabHtml = tabs.map(t => `
    <div class="staff-tab ${S.staffTab === t.id ? 'active' : ''}" onclick="S.staffTab='${t.id}';render()">${t.label}</div>
  `).join('');

  let content = '';
  if (S.staffTab === 'orders') content = staffOrders();
  else if (S.staffTab === 'stats') content = staffStats();
  else if (S.staffTab === 'menu') content = staffMenu();
  else if (S.staffTab === 'tables') content = staffTables();

  return `
  <div class="topbar">
    <div><div class="topbar-logo">🏨 Staff Dashboard</div><div class="topbar-sub"><span class="live-dot"></span>Live · ${new Date().toLocaleTimeString()}</div></div>
    <div class="topbar-spacer"></div>
    <button class="btn btn-ghost btn-sm" onclick="S.staffLoggedIn=false;navigate('landing')">Logout</button>
  </div>
  <div class="staff-tabs">${tabHtml}</div>
  <div class="fade-in">${content}</div>`;
}

function staffOrders() {
  const statuses = ['pending', 'preparing', 'ready'];
  const groups = statuses.map(s => {
    const orders = S.orders.filter(o => o.status === s);
    if (!orders.length) return '';
    const label = { pending: '⏳ New Orders', preparing: '👨‍🍳 In Kitchen', ready: '✅ Ready to Serve' }[s];
    const cards = orders.map(o => `
      <div class="order-card" onclick="navigate('staff-order',{selectedOrder:'${o.id}'})">
        <div class="order-card-header">
          <div class="order-id">T-${o.tableId}</div>
          <div class="tag ${statusColor(o.status)}">${statusLabel(o.status)}</div>
          <div class="order-time" style="margin-left:auto">${timeAgo(o.time)}</div>
        </div>
        <div class="order-items-preview">${o.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}</div>
        ${o.note ? `<div style="font-size:11px;color:var(--gold);margin-bottom:8px">📝 "${o.note}"</div>` : ''}
        <div class="order-footer">
          <div class="order-total">${fmt(o.total)}</div>
          <div style="display:flex;gap:6px">
            <div class="tag ${o.payment === 'mpesa' ? 'tag-green' : o.payment === 'stripe' ? 'tag-blue' : 'tag-amber'}">${o.payment === 'mpesa' ? '📱 M-Pesa' : o.payment === 'stripe' ? '💳 Card' : '💵 Cash'}</div>
            ${!o.payRef && o.payment === 'cash' ? `<div class="tag tag-red">⚠ Unpaid</div>` : ''}
          </div>
        </div>
      </div>`).join('');
    return `<div class="section-label">${label} (${orders.length})</div><div style="padding:0 16px;display:flex;flex-direction:column;gap:8px;margin-bottom:8px">${cards}</div>`;
  }).join('');
  const served = S.orders.filter(o => o.status === 'served');
  const servedHtml = served.length ? `
    <div class="section-label" style="cursor:pointer" onclick="toggleServed()">🍽️ Completed Today (${served.length}) ${S._showServed ? '▲' : '▼'}</div>
    ${S._showServed ? `<div style="padding:0 16px;display:flex;flex-direction:column;gap:8px;margin-bottom:16px">${served.slice(0, 5).map(o => `
      <div class="order-card" style="opacity:.6" onclick="navigate('staff-order',{selectedOrder:'${o.id}'})">
        <div class="order-card-header">
          <div class="order-id">T-${o.tableId}</div>
          <div class="tag tag-gray">🍽️ Served</div>
          <div class="order-time" style="margin-left:auto">${timeAgo(o.time)}</div>
        </div>
        <div class="order-footer"><div class="order-total">${fmt(o.total)}</div></div>
      </div>`).join('')}</div>` : ''}
  ` : '';
  return groups + (groups ? '' : '<div class="empty-state" style="padding:60px 20px"><div class="empty-icon">🎉</div><div class="empty-text">No active orders</div><div class="empty-sub">New orders will appear here instantly</div></div>') + servedHtml + '<div style="height:30px"></div>';
}

async function staffForgotPassword() {
  const email = document.getElementById('staff-email')?.value.trim();
  if (!email) return toast('Please enter staff email', '⚠');
  try {
    const res = await fetch('/api/staff/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const j = await res.json();
    if (j.resetUrl) {
      toast('Reset link created. Check console or email.', '✓');
      console.info('Staff reset URL:', j.resetUrl);
    } else {
      toast('If the email exists, a reset link was sent.', '✓');
    }
  } catch (e) {
    console.error(e);
    toast('Failed to request reset', '⚠');
  }
}

function viewStaffReset() {
  const token = S.resetToken || '';
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('staff-login')">←</div>
    <div><div class="topbar-logo">Reset Staff Password</div></div>
  </div>
  <div class="fade-in" style="padding:40px 24px;max-width:420px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:42px;margin-bottom:8px">🔐</div>
      <h2 style="margin-bottom:6px">Set a New Password</h2>
      <p style="font-size:13px;color:var(--cream-dim)">Enter a new password for your staff account</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <input id="reset-password" class="form-input" type="password" placeholder="New password" />
      <input id="reset-password-confirm" class="form-input" type="password" placeholder="Confirm password" />
      <button class="btn btn-gold btn-full" onclick="submitStaffReset()">Set Password</button>
    </div>
  </div>`;
}

async function submitStaffReset() {
  const pwd = document.getElementById('reset-password')?.value;
  const pwd2 = document.getElementById('reset-password-confirm')?.value;
  if (!pwd || !pwd2) return toast('Enter and confirm password', '⚠');
  if (pwd !== pwd2) return toast('Passwords do not match', '⚠');
  const token = S.resetToken;
  try {
    const res = await fetch('/api/staff/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pwd })
    });
    const j = await res.json();
    if (j.success) {
      toast('Password updated. You can sign in now.', '✓');
      navigate('staff-login');
    } else {
      toast(j.error || 'Reset failed', '⚠');
    }
  } catch (e) {
    console.error(e);
    toast('Reset failed', '⚠');
  }
}

function staffStats() {
  const total = S.orders.length;
  const revenue = S.orders.reduce((a, o) => a + o.total, 0);
  const serving = S.orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
  const mpesa = S.orders.filter(o => o.payment === 'mpesa').length;
  return `
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-val">${total}</div><div class="stat-lbl">Total Orders</div></div>
    <div class="stat-card"><div class="stat-val">${fmt(revenue)}</div><div class="stat-lbl">Total Revenue</div></div>
    <div class="stat-card"><div class="stat-val">${serving}</div><div class="stat-lbl">Active Tables</div></div>
    <div class="stat-card"><div class="stat-val">${mpesa}</div><div class="stat-lbl">M-Pesa Payments</div></div>
  </div>
  <div class="section-label">Revenue by Payment</div>
  <div style="padding:0 20px;display:flex;flex-direction:column;gap:8px">
    ${[{ label: '📱 M-Pesa', val: S.orders.filter(o => o.payment === 'mpesa').reduce((a, o) => a + o.total, 0) },
    { label: '💵 Cash', val: S.orders.filter(o => o.payment === 'cash').reduce((a, o) => a + o.total, 0) }]
      .map(r => `<div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:600">${r.label}</span>
      <span style="font-size:16px;font-weight:800;color:var(--gold)">${fmt(r.val)}</span>
    </div>`).join('')}
  </div>
  <div class="section-label">Top Items Today</div>
  <div style="padding:0 20px 30px;display:flex;flex-direction:column;gap:8px">
    ${getTopItems().map((t, i) => `
      <div class="card" style="display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;width:36px;text-align:center">${t.emoji}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:13px">${t.name}</div><div style="font-size:11px;color:var(--cream-dim)">${t.qty} orders</div></div>
        <div style="font-weight:700;font-size:14px;color:var(--gold)">${fmt(t.revenue)}</div>
      </div>`).join('')}
  </div>`;
}

function staffMenu() {
  const items = S.menu.map(m => `
    <div class="card" style="display:flex;align-items:center;gap:12px;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px;flex:1">
        <div style="font-size:22px">${m.emoji}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${m.name}</div>
          <div style="font-size:11px;color:var(--cream-dim)">${m.cat} · ${fmt(m.price)}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" onclick="toggleAvail(${m.id})">${m.avail ? '✓' : '✗'}</button>
        <button class="btn btn-sm btn-ghost" onclick="editItem(${m.id})">Edit</button>
        <button class="btn btn-sm btn-red" onclick="deleteItem(${m.id})">Del</button>
      </div>
    </div>`).join('');
  const addItemModal = S.showAddItem ? `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000">
      <div class="card" style="max-width:520px;width:92%">
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-size:42px">🍛</div>
          <div style="font-weight:700;margin-top:6px">Add Menu Item</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:0 8px 16px">
          <div style="display:flex;gap:8px">
            <input class="form-input" placeholder="Emoji (e.g. 🍔)" value="${esc(S.newItem.emoji)}" onchange="S.newItem.emoji=this.value;render()" style="width:88px" />
            <select class="form-input" onchange="S.newItem.cat=this.value;render()" value="${S.newItem.cat}">
              <option value="starters">Starters</option>
              <option value="mains">Mains</option>
              <option value="grills">Grills</option>
              <option value="drinks">Drinks</option>
              <option value="desserts">Desserts</option>
            </select>
            <input class="form-input" placeholder="Price" type="number" step="1" value="${S.newItem.price}" onchange="S.newItem.price=Number(this.value);render()" />
          </div>
          <input class="form-input" placeholder="Name" value="${esc(S.newItem.name)}" onchange="S.newItem.name=this.value;render()" />
          <input class="form-input" placeholder="Description" value="${esc(S.newItem.desc)}" onchange="S.newItem.desc=this.value;render()" />
        </div>
        <div style="display:flex;gap:10px;padding:12px">
          <button class="btn btn-outline btn-full" onclick="closeItemModal()">Cancel</button>
          <button class="btn btn-gold btn-full" onclick="saveNewItem()">Add Item</button>
        </div>
      </div>
    </div>
  ` : '';
  
  return `
  <div style="padding:16px 20px;display:flex;gap:10px">
    <button class="btn btn-gold btn-sm" onclick="openAddItem()">+ Add Item</button>
  </div>
  <div style="padding:0 20px 30px;display:flex;flex-direction:column;gap:8px">
    ${items}
  </div>
  ${addItemModal}`;
}

function staffTables() {
  const grid = S.tables.map(t => {
    const activeOrder = S.orders.find(o => o.tableId === t.id && ['pending', 'preparing', 'ready'].includes(o.status));
    return `
    <div style="position:relative">
      <div class="table-btn ${activeOrder ? 'occupied' : ''}" style="aspect-ratio:1;height:80px" onclick="${activeOrder ? `navigate('staff-order',{selectedOrder:'${activeOrder.id}'})` : `toast('Table ${t.id} is free','🟢')`}">
        <div class="table-num">${t.id}</div>
        <div class="tbl-status">${activeOrder ? `🔴 ${statusLabel(activeOrder.status).split(' ')[1]}` : '🟢 Free'}</div>
        ${activeOrder ? `<div style="font-size:9px;color:var(--gold)">${fmt(activeOrder.total)}</div>` : ''}
      </div>
      <button class="btn btn-red btn-sm" style="position:absolute;top:2px;right:2px;padding:4px 8px;font-size:11px;width:auto" onclick="deleteTable(${t.id});event.stopPropagation()">✕</button>
    </div>`;
  }).join('');
  const qrCards = S.tables.map(t => `
    <div class="card" style="display:flex;align-items:center;gap:12px">
      <div class="qr-wrap" style="padding:8px;border-radius:8px">${qrTarget(tableUrl(t.id), 86)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:var(--gold)">Table ${t.id}</div>
        <div style="font-size:10px;color:var(--cream-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tableUrl(t.id))}</div>
      </div>
    </div>`).join('');
  
  const addTablesModal = S.showAddTables ? `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000">
      <div class="card" style="max-width:400px;width:90%">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:12px">🪑</div>
          <h2 style="margin-bottom:6px">Add Tables</h2>
          <p style="font-size:13px;color:var(--cream-dim)">Enter how many tables to add to the system</p>
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--cream-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Number of Tables</label>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-ghost" style="flex:0;padding:8px 12px;font-size:18px" onclick="S.numTablesToAdd=Math.max(1,Number(S.numTablesToAdd)-1);render()">−</button>
            <input type="number" id="num-tables-input" value="${S.numTablesToAdd}" min="1" max="100" style="flex:1;text-align:center;font-size:20px;font-weight:700" onchange="S.numTablesToAdd=Math.max(1,Math.min(100,Number(this.value)));render()" />
            <button class="btn btn-ghost" style="flex:0;padding:8px 12px;font-size:18px" onclick="S.numTablesToAdd=Math.min(100,Number(S.numTablesToAdd)+1);render()">+</button>
          </div>
          <div style="font-size:11px;color:var(--cream-dim);margin-top:8px;text-align:center">Min: 1 | Max: 100</div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline btn-full" onclick="closeAddTablesModal()">Cancel</button>
          <button class="btn btn-gold btn-full" onclick="addTables()">Add Tables</button>
        </div>
      </div>
    </div>
  ` : '';
  
  return `
  <div style="padding:16px 20px 8px;display:flex;gap:10px;align-items:center;justify-content:space-between">
    <div style="display:flex;gap:10px">
      <div class="tag tag-green">🟢 ${S.tables.filter(t => t.status !== 'occupied').length} Free</div>
      <div class="tag tag-red">🔴 ${S.tables.filter(t => t.status === 'occupied').length} Occupied</div>
      <div class="tag tag-blue">📊 ${S.tables.length} Total</div>
    </div>
    <button class="btn btn-gold btn-sm" onclick="openAddTablesModal()" style="margin-left:auto">+ Add Tables</button>
  </div>
  <div class="table-grid" style="padding:8px 16px 16px">${grid}</div>
  <div class="section-label">Generated Table QR Codes</div>
  <div style="padding:0 20px 30px;display:flex;flex-direction:column;gap:8px">${qrCards}</div>
  ${addTablesModal}`;
}

function viewStaffOrder() {
  const order = S.orders.find(o => o.id === S.selectedOrder);
  if (!order) return navigate('staff-dashboard');
  const nextStatus = { pending: 'preparing', preparing: 'ready', ready: 'served' }[order.status];
  const nextLabel = { pending: 'Start Preparing 👨‍🍳', preparing: 'Mark as Ready ✅', ready: 'Mark Served 🍽️' }[order.status];
  const steps = ['pending', 'preparing', 'ready', 'served'];
  return `
  <div class="topbar">
    <div class="topbar-back" onclick="navigate('staff-dashboard')">←</div>
    <div><div class="topbar-logo">Order ${order.id}</div><div class="topbar-sub">Table ${order.tableId} · ${timeAgo(order.time)}</div></div>
    <div class="topbar-spacer"></div>
    <div class="tag ${statusColor(order.status)}">${statusLabel(order.status)}</div>
  </div>
  <div class="fade-in" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px">
    <div class="status-flow">
      ${steps.map(s => `<div class="status-step ${order.status === s ? 'current' : steps.indexOf(s) < steps.indexOf(order.status) ? 'done' : ''}">${{ pending: '⏳ New', preparing: '🍳 Cooking', ready: '✅ Ready', served: '🍽️ Served' }[s]}</div>`).join('')}
    </div>
    <div class="card">
      <div class="section-label" style="padding:0 0 10px">Order Items</div>
      ${order.items.map(i => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:22px">${i.emoji}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${i.name}</div></div>
          <div style="font-size:13px;color:var(--cream-dim)">×${i.qty}</div>
          <div style="font-size:14px;font-weight:700;color:var(--gold)">${fmt(i.price * i.qty)}</div>
        </div>`).join('')}
      ${order.note ? `<div style="margin-top:10px;padding:10px;background:var(--card2);border-radius:8px;font-size:12px;color:var(--gold)">📝 ${order.note}</div>` : ''}
      <div style="display:flex;justify-content:space-between;padding-top:12px;font-weight:800;font-size:16px">
        <span>Total</span><span style="color:var(--gold)">${fmt(order.total)}</span>
      </div>
    </div>
    <div class="card">
      <div style="font-size:12px;color:var(--cream-dim);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Payment</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">${order.payment === 'mpesa' ? '📱' : order.payment === 'stripe' ? '💳' : '💵'}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${order.payment === 'mpesa' ? 'M-Pesa' : order.payment === 'stripe' ? 'Card' : 'Cash'}</div>
          <div style="font-size:11px;color:${order.payRef ? 'var(--green-lt)' : 'var(--red)'}">${order.payRef || '⚠ Payment not yet verified'}</div>
        </div>
        ${!order.payRef && order.payment === 'cash' ? `<button class="btn btn-gold btn-sm" onclick="verifyCashStaff('${order.id}')">Verify Cash QR</button>` : '<div class="tag tag-green">✓ Paid</div>'}
      </div>
    </div>
    ${nextStatus ? `
    <button class="btn btn-gold btn-full" onclick="advanceStatus('${order.id}')">${nextLabel}</button>
    ` : `<div class="card" style="text-align:center;color:var(--cream-dim)">Order completed</div>`}
    ${order.status !== 'served' && order.status !== 'cancelled' ? `
    <button class="btn btn-red btn-full btn-sm" onclick="cancelOrder('${order.id}')">Cancel Order</button>
    ` : ''}
  </div>`;
}

function advanceStatus(id) {
  const o = S.orders.find(o => o.id === id);
  if (!o) return;
  if (o.payment === 'cash' && !o.payRef) {
    toast('Verify cash payment before sending to kitchen', '⚠');
    return;
  }
  const seq = ['pending', 'preparing', 'ready', 'served'];
  const idx = seq.indexOf(o.status);
  if (idx < seq.length - 1) {
    o.status = seq[idx + 1];
  }
  updateTableStatus();
  toast('Status updated: ' + statusLabel(o.status), '✓');
  render();
}

function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  const o = S.orders.find(o => o.id === id);
  if (o) {
    o.status = 'cancelled';
    updateTableStatus();
    toast('Order cancelled', '✗');
    navigate('staff-dashboard');
  }
}

function verifyCashStaff(id) {
  const o = S.orders.find(o => o.id === id);
  if (o) {
    o.payRef = genPayRef('cash');
    saveState();
    toast('Cash payment verified!', '✓');
    render();
  }
}
