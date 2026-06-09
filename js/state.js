// ═══════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════

const S = {
  view: 'auth-login',
  tableId: null,
  cart: [],
  activeCategory: 'all',
  authMode: 'signin',
  isAuthenticated: false,
  user: null,
  authToken: null,
  appConfig: { stripePublishableKey: null, stripeEnabled: false, mpesaEnabled: false, twilioEnabled: false, resendEnabled: false },
  staffLoggedIn: false,
  staffTab: 'orders',
  selectedOrder: null,
  mpesaPhone: '',
  mpesaStep: 0,
  editingItem: null,
  showAddItem: false,
  showAddTables: false,
  numTablesToAdd: 1,
  currentOrderId: null,
  _showServed: false,

  orders: [],
  menu: [],
  tables: [],

  newItem: { cat: 'mains', emoji: '🍽️', name: '', desc: '', price: '', avail: true }
};

// Initialize state from constants
function initializeState() {
  S.orders = JSON.parse(JSON.stringify(SAMPLE_ORDERS));
  S.menu = JSON.parse(JSON.stringify(MENU_DATA));
  S.tables = Array.from({ length: TABLES_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Table ${i + 1}`,
    status: 'free'
  }));
  loadState();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    ['orders', 'menu', 'tables'].forEach(k => {
      if (Array.isArray(saved[k])) S[k] = saved[k];
    });
  } catch (e) {
    console.warn('Could not load saved state', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      orders: S.orders,
      menu: S.menu,
      tables: S.tables
    }));
  } catch (e) {
    console.warn('Could not save state', e);
  }
}

function updateTableStatus() {
  S.tables.forEach(t => {
    const active = S.orders.find(o => o.tableId === t.id && ['pending', 'preparing', 'ready'].includes(o.status));
    t.status = active ? 'occupied' : 'free';
  });
}
