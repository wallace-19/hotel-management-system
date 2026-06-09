# 📱 QR Code System - Complete Flow Diagram

**Date:** June 5, 2026  
**Version:** 1.0.0

## The Complete Journey: QR Scan to Order Delivery

```
     📱 STEP 1: QR Scan
        ↓
     Guest scans table QR code with phone camera
        ↓
────────────────────────────────────────
        ↓
     STEP 2: /tables/5 Route
        ↓
     Browser navigates to table page
        ↓
────────────────────────────────────────
        ↓
  STEP 3: Backend Creates Session
        ↓
  - Server receives GET /tables/5
  - Validates table ID
  - Generates unique sessionId
  - Fetches table info from database
  - Logs: "[TABLE_SESSION] Created session ABC123 for Table 5"
        ↓
────────────────────────────────────────
        ↓
   STEP 4: Menu Loads
        ↓
  - Server sends HTML with session context
  - Client stores session in localStorage
  - JavaScript initializes global state:
    * S.tableId = 5
    * S.sessionId = "ABC123"
    * S.isTableMode = true
  - Logs: "[SESSION] Created session for Table 5 - ID: ABC123"
        ↓
────────────────────────────────────────
        ↓
  STEP 5: Customer Orders
        ↓
  - Menu items display
  - Guest selects items (e.g., 2x Burger, 1x Soda)
  - Guest clicks "Place Order"
  - JavaScript calls: placeOrder(items)
        ↓
────────────────────────────────────────
        ↓
  STEP 6: Order Saved Under Session
        ↓
  POST /api/orders
  {
    "tableId": 5,
    "sessionId": "ABC123",
    "items": [
      {"id": 1, "name": "Burger", "price": 500, "quantity": 2},
      {"id": 2, "name": "Soda", "price": 100, "quantity": 1}
    ],
    "status": "pending"
  }
        ↓
  - Backend calculates total: (500×2) + (100×1) = 1100
  - Inserts into orders table:
    * table_id: 5
    * session_id: "ABC123"
    * items: [...]
    * total_amount: 1100
    * status: "pending"
    * created_at: "2026-06-05T12:30:00Z"
  - Returns order with ID (e.g., 42)
  - Logs: "[ORDER_CREATED] Order #42 created for Table 5"
        ↓
────────────────────────────────────────
        ↓
Kitchen Dashboard Receives Order
        ↓
  - Kitchen staff sees Order #42
  - Shows: Table 5 | 2x Burger, 1x Soda | Ksh 1100
  - Status: PENDING (new order)
  - Logs: "[KITCHEN_NOTIFY] Kitchen dashboard updated with new order"
        ↓
────────────────────────────────────────
        ↓
Status Updates (preparing → served → paid)
        ↓

⏳ PENDING (Initial State)
  ├─ Order received
  ├─ Customer sees: "Order received, waiting for kitchen"
  └─ Kitchen sees: [NEW ORDER] Table 5

👨‍🍳 PREPARING (Kitchen updates status)
  ├─ Kitchen staff clicks "Start Preparing"
  ├─ PATCH /api/orders/42 { "status": "preparing" }
  ├─ Customer sees: "Your order is being prepared"
  ├─ Kitchen sees: [PREPARING] Table 5
  └─ Logs: "[ORDER_STATUS] Order #42 status changed to: preparing"

✅ READY (Kitchen completes)
  ├─ Kitchen staff clicks "Ready"
  ├─ PATCH /api/orders/42 { "status": "ready" }
  ├─ Customer notification: "Your order is ready!"
  ├─ Kitchen sees: [READY] Table 5 - Ready for pickup
  └─ Logs: "[ORDER_STATUS] Order #42 status changed to: ready"

🍽️ SERVED (Server delivers)
  ├─ Server delivers to Table 5
  ├─ Server clicks "Mark Served"
  ├─ PATCH /api/orders/42 { "status": "served" }
  ├─ Customer sees: "Your order has been delivered"
  └─ Logs: "[ORDER_STATUS] Order #42 status changed to: served"

💳 PAID (Payment complete)
  ├─ Guest pays at table or register
  ├─ PATCH /api/orders/42 { "status": "paid" }
  ├─ Table session ends
  ├─ Order marked complete
  └─ Logs: "[ORDER_STATUS] Order #42 status changed to: paid"
        ↓
────────────────────────────────────────
        ↓
    ✅ ORDER COMPLETE
```

---

## API Endpoints Used in Flow

### 1. Get Table Page (Read Session Creation)
```
GET /tables/5

Response: HTML with session context
- sessionId: ABC123
- tableId: 5
- sessionStartTime: 2026-06-05T12:30:00Z
```

### 2. Place Order (Create with Session)
```
POST /api/orders

Request:
{
  "tableId": 5,
  "sessionId": "ABC123",
  "items": [
    {"id": 1, "name": "Burger", "price": 500, "quantity": 2},
    {"id": 2, "name": "Soda", "price": 100, "quantity": 1}
  ],
  "status": "pending"
}

Response:
{
  "id": 42,
  "table_id": 5,
  "session_id": "ABC123",
  "items": [...],
  "total_amount": 1100,
  "status": "pending",
  "created_at": "2026-06-05T12:30:00Z"
}
```

### 3. Get Order Status (Monitor)
```
GET /api/orders/42

Response:
{
  "id": 42,
  "table_id": 5,
  "session_id": "ABC123",
  "status": "preparing",
  "items": [...],
  "total_amount": 1100,
  "created_at": "2026-06-05T12:30:00Z",
  "updated_at": "2026-06-05T12:35:00Z"
}
```

### 4. Update Order Status (Kitchen/Server)
```
PATCH /api/orders/42

Request:
{
  "status": "ready"
}

Response:
{
  "id": 42,
  "status": "ready",
  "updated_at": "2026-06-05T12:40:00Z",
  ...
}
```

### 5. Get All Orders for Table
```
GET /api/tables/5/orders

Response:
[
  {
    "id": 42,
    "table_id": 5,
    "session_id": "ABC123",
    "status": "ready",
    "total_amount": 1100,
    "created_at": "2026-06-05T12:30:00Z"
  }
]
```

---

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL REFERENCES tables(id),
  session_id VARCHAR(64),              -- Links to table ordering session
  items JSONB,                         -- Order items (name, price, qty)
  total_amount DECIMAL(10, 2),        -- Total cost
  status VARCHAR(50) DEFAULT 'pending', -- pending|preparing|ready|served|paid
  special_notes TEXT,                 -- Special requests
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### Tables Table
```sql
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  section VARCHAR(100),          -- Dining section
  capacity INT,                  -- Max guests
  status VARCHAR(50),            -- available|occupied|maintenance
  qr_code_url VARCHAR(500),     -- QR code URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Session Management

### Session Creation (Backend)
```javascript
// When GET /tables/:tableId is called
const sessionId = generateToken();  // Creates unique ID
const sessionStartTime = new Date().toISOString();

console.log(`[TABLE_SESSION] Created session ${sessionId} for Table ${tableId}`);
```

### Session Storage (Client)
```javascript
// Session stored in localStorage for persistence
localStorage.setItem('tableSession', JSON.stringify({
  tableId: 5,
  sessionId: 'ABC123',
  startTime: '2026-06-05T12:30:00Z'
}));

// Retrieve session across page reloads
const session = JSON.parse(localStorage.getItem('tableSession'));
```

### Session Usage in Orders
```javascript
// Order placed with session context
await placeOrder({
  tableId: 5,
  sessionId: 'ABC123',  // Maintains session link
  items: [...],
  status: 'pending'
});
```

---

## Logging for Monitoring

### Key Log Points
```
[TABLE_SESSION]  Table session created
[SESSION]        Session initialized with ID
[ORDER_CREATED]  New order created
[KITCHEN_NOTIFY] Kitchen dashboard updated
[ORDER_STATUS]   Order status changed
[PAYMENT_RECEIVED] Payment processed
```

### Example Logs
```
[TABLE_SESSION] Created session ABC123 for Table 5 at 2026-06-05T12:30:00Z
[SESSION] Created session for Table 5 - ID: ABC123
[ORDER_CREATED] Order #42 created for Table 5
[KITCHEN_NOTIFY] Kitchen dashboard updated with new order
[ORDER_STATUS] Order #42 status changed to: preparing
[ORDER_STATUS] Order #42 status changed to: ready
[ORDER_STATUS] Order #42 status changed to: served
[ORDER_STATUS] Order #42 status changed to: paid
```

---

## Status Progression States

```
┌──────────────┐
│   PENDING    │ ← Initial state (order received)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  PREPARING   │ ← Kitchen is preparing
└──────┬───────┘
       │
       ↓
┌──────────────┐
│    READY     │ ← Food ready for pickup
└──────┬───────┘
       │
       ↓
┌──────────────┐
│    SERVED    │ ← Delivered to table
└──────┬───────┘
       │
       ↓
┌──────────────┐
│     PAID     │ ← Payment received (complete)
└──────────────┘
```

### State Transition Rules
- `PENDING` → `PREPARING` (Kitchen starts cooking)
- `PREPARING` → `READY` (Food is ready)
- `READY` → `SERVED` (Delivered to customer)
- `SERVED` → `PAID` (Payment complete)
- (No backwards transitions)

---

## Real-Time Updates (Optional Enhancement)

For live updates on status changes, consider:

### WebSocket Approach
```javascript
// Client listens for order updates
const socket = io(appUrl);
socket.on('order:status-changed', (order) => {
  console.log(`Order #${order.id} status: ${order.status}`);
  updateUI(order);
});
```

### Polling Approach
```javascript
// Client periodically checks order status
setInterval(async () => {
  const order = await fetch(`/api/orders/42`).then(r => r.json());
  if (order.status !== currentStatus) {
    currentStatus = order.status;
    updateUI(order);
  }
}, 2000); // Check every 2 seconds
```

---

## Example: Complete Order Journey

### Timeline
```
12:30:00 - Guest scans QR code for Table 5
12:30:05 - Session ABC123 created
12:30:10 - Menu loads, guest sees items
12:30:45 - Guest clicks "Order" (2x Burger, 1x Soda)
12:30:46 - Order #42 created, kitchen notified
12:30:47 - Kitchen staff sees new order
12:31:00 - Kitchen marks as "PREPARING"
12:35:00 - Kitchen marks as "READY" (5 min cooking)
12:35:15 - Server marks as "SERVED"
12:45:00 - Guest pays bill
12:45:01 - Order marked "PAID"
12:45:02 - Session ends, table available
```

### Order Data at Each Step
```javascript
// Step 1: Order Created (pending)
{
  id: 42,
  table_id: 5,
  session_id: 'ABC123',
  status: 'pending',
  items: [
    {id: 1, name: 'Burger', price: 500, quantity: 2},
    {id: 2, name: 'Soda', price: 100, quantity: 1}
  ],
  total_amount: 1100,
  created_at: '2026-06-05T12:30:46Z'
}

// Step 2: Kitchen Updates (preparing)
{
  ...same,
  status: 'preparing',
  updated_at: '2026-06-05T12:31:00Z'
}

// Step 3: Kitchen Ready (ready)
{
  ...same,
  status: 'ready',
  updated_at: '2026-06-05T12:35:00Z'
}

// Step 4: Served (served)
{
  ...same,
  status: 'served',
  updated_at: '2026-06-05T12:35:15Z'
}

// Step 5: Payment (paid)
{
  ...same,
  status: 'paid',
  updated_at: '2026-06-05T12:45:01Z'
}
```

---

## Implementation Checklist

- [x] QR code generation script
- [x] /tables/:id route with session creation
- [x] Session ID generation and storage
- [x] POST /api/orders endpoint
- [x] GET /api/orders/:id endpoint
- [x] GET /api/tables/:id/orders endpoint
- [x] PATCH /api/orders/:id endpoint (status updates)
- [x] Order table schema in database
- [ ] Kitchen dashboard UI
- [ ] Real-time notifications (optional)
- [ ] Payment integration
- [ ] Kitchen printing system (optional)

---

**Version:** 1.0.0  
**Status:** Complete ✅  
**Last Updated:** June 5, 2026
