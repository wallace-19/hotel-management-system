// ═══════════════════════════════════════
// RENDER ENGINE
// ═══════════════════════════════════════

function render() {
  const app = document.getElementById('app');
  let html = '';
  
  switch (S.view) {
    case 'landing':
      html = viewLanding();
      break;
    case 'auth-login':
      html = viewAuthPage();
      break;
    case 'table-select':
      html = viewTableSelect();
      break;
    case 'customer-menu':
      html = viewCustomerMenu();
      break;
    case 'customer-cart':
      html = viewCustomerCart();
      break;
    case 'customer-checkout':
      html = viewCustomerCheckout();
      break;
    case 'customer-stripe':
      html = viewCustomerStripe();
      break;
    case 'customer-mpesa':
      html = viewCustomerMpesa();
      break;
    case 'customer-cash':
      html = viewCustomerCash();
      break;
    case 'customer-receipt':
      html = viewCustomerReceipt();
      break;
    case 'staff-login':
      _pin = '';
      html = viewStaffLogin();
      break;
    case 'staff-dashboard':
      html = viewStaffDashboard();
      break;
    case 'staff-order':
      html = viewStaffOrder();
      break;
    default:
      html = viewLanding();
  }
  
  app.innerHTML = html;
  if (S.view === 'customer-stripe') {
    setTimeout(() => {
      if (document.getElementById('stripe-card-element') && typeof initializeStripeElement === 'function') {
        try {
          initializeStripeElement();
        } catch (error) {
          console.warn('Stripe init failed:', error);
        }
      }
    }, 100);
  }
  saveState();
  renderQRCodes();
}

// Auto-refresh logic
setInterval(() => {
  if (S.view === 'staff-dashboard' && !S.showAddItem && !S.editingItem && !S.showAddTables) {
    render();
  }
  if (S.view === 'customer-cash') {
    const order = S.orders.find(o => o.id === S.currentOrderId);
    if (order && order.payRef) {
      navigate('customer-receipt');
    }
  }
}, 15000);

// Global window functions
window.navigate = navigate;
window.selectTable = selectTable;
window.setCategory = setCategory;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.proceedToCheckout = proceedToCheckout;
window.startStripePayment = startStripePayment;
window.startMpesa = startMpesa;
window.placeCashOrder = placeCashOrder;
window.verifyCashManually = verifyCashManually;
window.staffSignIn = staffSignIn;
window.toggleServed = toggleServed;
window.advanceStatus = advanceStatus;
window.cancelOrder = cancelOrder;
window.verifyCashStaff = verifyCashStaff;
window.toggleAvail = toggleAvail;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.openAddItem = openAddItem;
window.saveNewItem = saveNewItem;
window.saveEditItem = saveEditItem;
window.closeItemModal = closeItemModal;
window.fetchMenu = fetchMenu;
window.openAddTablesModal = openAddTablesModal;
window.closeAddTablesModal = closeAddTablesModal;
window.addTables = addTables;
window.deleteTable = deleteTable;
window.switchAuthMode = switchAuthMode;
window.submitAuthForm = submitAuthForm;
window.signOutUser = signOutUser;
window.apiFetch = apiFetch;

// Storage event listener
window.addEventListener('storage', e => {
  if (e.key !== STORAGE_KEY) return;
  loadState();
  updateTableStatus();
  render();
});

// Boot up
function bootApp() {
  const params = new URLSearchParams(location.search);
  const initialTable = params.get('table');
  if (initialTable) {
    const id = Number(initialTable);
    if (S.tables.some(t => t.id === id)) {
      S.tableId = id;
      navigate('customer-menu');
      return;
    }
  }

  // support staff password reset links: ?view=staff-reset&token=...
  const viewParam = params.get('view');
  const tokenParam = params.get('token');
  if (viewParam === 'staff-reset' && tokenParam) {
    S.resetToken = tokenParam;
    navigate('staff-reset');
    return;
  }
  // load menu from server then render
  if (typeof fetchMenu === 'function') {
    fetchMenu();
    return;
  }
  render();
}
