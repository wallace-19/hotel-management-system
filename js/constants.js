// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════

const STORAGE_KEY = 'zawai-hotel-pos-state-v1';

const MENU_DATA = [
  { id: 1, cat: 'starters', emoji: '🫔', name: 'Samosa Trio', desc: 'Crispy golden samosas — veg, beef & chicken', price: 350, avail: true },
  { id: 2, cat: 'starters', emoji: '🫙', name: 'Soup of the Day', desc: 'Chef\'s seasonal soup with artisan bread', price: 450, avail: true },
  { id: 3, cat: 'starters', emoji: '🍗', name: 'Chicken Wings', desc: 'Glazed wings with peri-peri dip', price: 680, avail: true },
  { id: 4, cat: 'mains', emoji: '🍖', name: 'Nyama Choma', desc: 'Char-grilled goat, kachumbari & ugali', price: 1200, avail: true },
  { id: 5, cat: 'mains', emoji: '🐟', name: 'Grilled Tilapia', desc: 'Whole tilapia, lemon butter & rice', price: 950, avail: true },
  { id: 6, cat: 'mains', emoji: '🍛', name: 'Chicken Biryani', desc: 'Aromatic long-grain rice, tender chicken', price: 780, avail: true },
  { id: 7, cat: 'mains', emoji: '🌾', name: 'Veggie Pilau', desc: 'Spiced pilau with seasonal vegetables', price: 650, avail: true },
  { id: 8, cat: 'grills', emoji: '🥩', name: 'T-Bone Steak', desc: '400g aged beef, garlic butter & fries', price: 2200, avail: true },
  { id: 9, cat: 'grills', emoji: '🍖', name: 'Lamb Chops', desc: 'Herb-marinated, minted yoghurt sauce', price: 1800, avail: true },
  { id: 10, cat: 'grills', emoji: '🍽️', name: 'Mixed Grill Platter', desc: 'Steak, lamb chops, chicken & sausages', price: 2400, avail: true },
  { id: 11, cat: 'drinks', emoji: '🥤', name: 'Fresh Juice', desc: 'Mango, passion, pineapple or mix', price: 250, avail: true },
  { id: 12, cat: 'drinks', emoji: '🥤', name: 'Soft Drink', desc: 'Coke, Sprite, Fanta, Stoney', price: 150, avail: true },
  { id: 13, cat: 'drinks', emoji: '🍺', name: 'Tusker Beer', desc: 'Ice-cold 500ml Tusker Lager', price: 350, avail: true },
  { id: 14, cat: 'drinks', emoji: '🍷', name: 'House Wine (Glass)', desc: 'Red or white, imported selection', price: 600, avail: true },
  { id: 15, cat: 'desserts', emoji: '🍩', name: 'Maandazi & Honey', desc: 'Warm Swahili donuts, acacia honey dip', price: 280, avail: true },
  { id: 16, cat: 'desserts', emoji: '🍧', name: 'Pineapple Sorbet', desc: 'House-made, coast pineapple & lime', price: 320, avail: true },
  { id: 17, cat: 'desserts', emoji: '🎂', name: 'Lava Cake', desc: 'Dark chocolate, vanilla ice cream', price: 450, avail: true },
];

const SAMPLE_ORDERS = [
  {
    id: 'ORD-001', tableId: 3, status: 'preparing',
    items: [
      { emoji: '🍗', name: 'Chicken Biryani', qty: 2, price: 780 },
      { emoji: '🥤', name: 'Fresh Juice', qty: 2, price: 250 }
    ],
    payment: 'mpesa', payRef: 'MPESA-7XB4K', total: 2060, time: Date.now() - 12 * 60000,
    note: 'Extra spicy please'
  },
  {
    id: 'ORD-002', tableId: 7, status: 'ready',
    items: [
      { emoji: '🥩', name: 'T-Bone Steak', qty: 1, price: 2200 },
      { emoji: '🍺', name: 'Tusker Beer', qty: 2, price: 350 }
    ],
    payment: 'cash', payRef: 'CASH-QR-002', total: 2900, time: Date.now() - 25 * 60000,
    note: ''
  },
  {
    id: 'ORD-003', tableId: 1, status: 'pending',
    items: [
      { emoji: '🫔', name: 'Samosa Trio', qty: 1, price: 350 },
      { emoji: '🫙', name: 'Soup of the Day', qty: 1, price: 450 }
    ],
    payment: 'cash', payRef: '', total: 800, time: Date.now() - 3 * 60000,
    note: 'Table by the window'
  },
];

const TABLES_COUNT = 12;
