# 🔧 QR Code System - Technical Integration Guide

Complete technical reference for developers integrating the QR code system with the Zawai Hotel application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [URL Structure](#url-structure)
3. [Server Routes](#server-routes)
4. [Client-Side Integration](#client-side-integration)
5. [QR Generation API](#qr-generation-api)
6. [Database Schema](#database-schema)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Security](#security)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────┐
│   QR Code Generation System         │
├─────────────────────────────────────┤
│  • generate-qr-codes.js (CLI)       │
│  • QRCode library (npm package)     │
│  • Sharp image processing           │
└──────────────────┬──────────────────┘
                   │ generates
                   ▼
        ┌──────────────────────┐
        │  QR Code Files       │
        │  • PNG (1000x1000)   │
        │  • SVG (scalable)    │
        │  • manifest.json     │
        └──────────────────────┘
                   │ scanned by
                   ▼
        ┌──────────────────────┐
        │  Table Page Route    │
        │  /tables/{id}        │
        └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Table Menu UI       │
        │  • Order interface   │
        │  • Status display    │
        └──────────────────────┘
```

### Data Flow

The complete QR code system flow from scanning to order delivery:

```
     📱 QR Scan
        ↓
    /tables/5
        ↓
Backend creates session
(sessionId generated)
        ↓
   Menu loads
(sessionId passed to client)
        ↓
  Customer orders
(items selected)
        ↓
POST /api/orders
(order with sessionId)
        ↓
Order saved to database
(linked to table & session)
        ↓
Kitchen dashboard
(receives order notification)
        ↓
PATCH /api/orders/{id}
(status updates)
        ↓
Status progression:
pending → preparing → ready 
       → served → paid
```

**Complete Architecture:**

1. **QR Generation Phase:**
   - CLI script reads configuration
   - Generates URL for each table: `https://domain/tables/{id}`
   - Creates QR code using qrcode library
   - Saves PNG and SVG formats
   - Generates manifest.json

2. **QR Scanning & Session Creation:**
   - Guest scans QR code with phone
   - Browser navigates to `/tables/{id}`
   - **Backend creates unique session** for that table visit
   - Session ID generated and stored
   - Table-specific page rendered with session context

3. **Menu Display & Ordering:**
   - Menu loads for the table
   - Guest selects items
   - Session ID maintained in localStorage
   - Order API called with table ID + session ID

4. **Order Persistence & Notification:**
   - Order saved to database
   - Linked to table ID and session ID
   - Kitchen dashboard receives real-time notification
   - Order appears in kitchen prep queue

5. **Status Tracking:**
   - Kitchen updates order status
   - Status progression: pending → preparing → ready → served → paid
   - Customer sees status updates on their screen
   - Kitchen marks as complete when delivered

---

## URL Structure

### Standard URL Format

```
https://{domain}/tables/{table_id}
```

### Examples

```
https://yourdomain.com/tables/1
https://yourdomain.com/tables/42
https://yourdomain.com/tables/100
```

### URL Components

| Component | Type | Format | Example |
|-----------|------|--------|---------|
| Scheme | Protocol | `https://` | https:// |
| Domain | Host | Domain name | yourdomain.com |
| Path | Route | /tables/ | /tables/ |
| Table ID | Parameter | Integer | 1, 42, 100 |

### Environment Configuration

```javascript
// server.js
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

// Generate table URL
const tableUrl = `${appUrl}/tables/${tableId}`;
```

### Environment Variables (.env)

```env
# Base domain for QR codes (used in generation)
APP_URL=https://yourdomain.com
BASE_DOMAIN=https://yourdomain.com

# For development
# APP_URL=http://localhost:3000
```

---

## Server Routes

### 1. Serve Table Page

**Route:** `GET /tables/:tableId`

**Description:** Serves the table-specific menu page when QR code is scanned.

**Implementation:**
```javascript
// In server.js
app.get('/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;

  // Validate table ID
  if (!tableId || isNaN(tableId)) {
    return res.status(400).json({ error: 'Invalid table ID' });
  }

  try {
    // Fetch table info (optional)
    const { data: tableData } = await supabase
      .from('tables')
      .select('*')
      .eq('id', parseInt(tableId, 10))
      .single();

    // Render HTML page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table ${tableId}</title>
      </head>
      <body>
        <h1>Table ${tableId}</h1>
        <!-- Menu content -->
      </body>
      </html>
    `;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Response:** HTML page with table context

### 2. Generate QR Codes (Admin API)

**Route:** `POST /api/qr/generate`

**Description:** Generate QR codes on demand via API.

**Authentication:** Admin required

**Request Body:**
```json
{
  "tableIds": [1, 2, 3, 4, 5],
  "domain": "https://yourdomain.com",
  "formats": ["png", "svg"]
}
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "domain": "https://yourdomain.com",
  "results": [
    {
      "tableId": 1,
      "url": "https://yourdomain.com/tables/1",
      "generated": "2026-06-05T10:30:00Z",
      "png": "base64_encoded_png_data",
      "svg": "<svg>...</svg>"
    }
  ]
}
```

**Implementation:**
```javascript
app.post('/api/qr/generate', verifyFirebaseToken, requireAdmin, async (req, res) => {
  const { tableIds = [], domain = appUrl, formats = ['png', 'svg'] } = req.body;

  if (!Array.isArray(tableIds) || tableIds.length === 0) {
    return res.status(400).json({ error: 'tableIds array is required' });
  }

  try {
    const QRCode = require('qrcode');
    const results = [];

    for (const tableId of tableIds) {
      const url = `${domain}/tables/${tableId}`;
      const qrData = {};

      // PNG format
      if (formats.includes('png')) {
        const pngBuffer = await QRCode.toBuffer(url, {
          errorCorrectionLevel: 'Q',
          type: 'image/png',
          width: 1000,
          margin: 4,
        });
        qrData.png = pngBuffer.toString('base64');
      }

      // SVG format
      if (formats.includes('svg')) {
        const svgString = await QRCode.toString(url, {
          errorCorrectionLevel: 'Q',
          type: 'image/svg+xml',
          width: 100,
          margin: 4,
        });
        qrData.svg = svgString;
      }

      results.push({
        tableId,
        url,
        generated: new Date().toISOString(),
        ...qrData,
      });
    }

    res.json({ success: true, count: results.length, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Validate QR Code

**Route:** `POST /api/qr/validate`

**Description:** Validate that a QR code URL is valid and decodes correctly.

**Request Body:**
```json
{
  "url": "https://yourdomain.com/tables/1"
}
```

**Response:**
```json
{
  "valid": true,
  "tableId": 1,
  "url": "https://yourdomain.com/tables/1",
  "decodable": true
}
```

### 4. Get QR Configuration

**Route:** `GET /api/qr/config`

**Description:** Get current QR code system configuration.

**Response:**
```json
{
  "baseDomain": "https://yourdomain.com",
  "resolution": 1000,
  "errorCorrection": "Q",
  "quietZone": 4,
  "formats": ["png", "svg"],
  "urlPattern": "/tables/{table_id}"
}
```

### 5. Get Table Information

**Route:** `GET /api/tables/:tableId`

**Description:** Get information about a specific table.

**Response:**
```json
{
  "id": 1,
  "status": "available",
  "capacity": 4,
  "section": "Main Dining",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Client-Side Integration

### Initialize Table Context

**In table page JavaScript:**
```javascript
// Get table ID from URL
const tableId = window.location.pathname.match(/\/tables\/(\d+)/)?.[1];

// Initialize global state
if (window.S) {
  S.currentTableId = parseInt(tableId, 10);
  S.isTableMode = true;
  console.log('✓ Table mode initialized for Table', tableId);
}

// Fetch table data
async function loadTableData() {
  try {
    const response = await fetch(`/api/tables/${tableId}`);
    const tableData = await response.json();
    
    console.log('Table data:', tableData);
    // Update UI with table info
  } catch (error) {
    console.error('Failed to load table data:', error);
  }
}

// Load menu for specific table
async function loadMenu() {
  try {
    const response = await fetch(`/api/menus?tableId=${tableId}`);
    const menuData = await response.json();
    
    // Render menu in UI
    renderMenu(menuData);
  } catch (error) {
    console.error('Failed to load menu:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadTableData();
  loadMenu();
});
```

### Call Staff Button

```javascript
// In table page
async function callStaff() {
  try {
    const response = await fetch('/api/staff/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: window.S.currentTableId,
        reason: 'Assistance needed',
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();
    if (result.success) {
      showNotification('Staff has been notified');
    }
  } catch (error) {
    console.error('Failed to call staff:', error);
  }
}
```

### Place Order from Table

```javascript
async function placeOrder(items) {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: window.S.currentTableId,
        items: items,
        totalAmount: calculateTotal(items),
        timestamp: new Date().toISOString()
      })
    });

    const order = await response.json();
    if (order.id) {
      showSuccess(`Order #${order.id} placed successfully`);
    }
  } catch (error) {
    console.error('Failed to place order:', error);
  }
}
```

---

## QR Generation API

### Using the CLI

```bash
# Generate QR codes for tables 1-100
node scripts/generate-qr-codes.js --tables 1-100

# With custom domain
node scripts/generate-qr-codes.js \
  --tables 1-100 \
  --domain https://myhotel.com

# With logo embedding
node scripts/generate-qr-codes.js \
  --tables 1-100 \
  --logo ./assets/logo.png

# PNG only
node scripts/generate-qr-codes.js \
  --tables 1-100 \
  --format png
```

### Programmatic Generation

```javascript
// In Node.js script
const QRCode = require('qrcode');

async function generateTableQR(tableId, domain) {
  const url = `${domain}/tables/${tableId}`;

  // Generate PNG
  const pngBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'Q',
    type: 'image/png',
    width: 1000,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Generate SVG
  const svgString = await QRCode.toString(url, {
    errorCorrectionLevel: 'Q',
    type: 'image/svg+xml',
    width: 100,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return { png: pngBuffer, svg: svgString };
}

// Usage
const qrCodes = await generateTableQR(1, 'https://yourdomain.com');
```

### API-Based Generation

```javascript
// From client
async function generateQRCodes(tableIds) {
  const response = await fetch('/api/qr/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`  // Admin token required
    },
    body: JSON.stringify({
      tableIds: tableIds,
      domain: 'https://yourdomain.com',
      formats: ['png', 'svg']
    })
  });

  const result = await response.json();
  return result.results;
}

// Usage
const results = await generateQRCodes([1, 2, 3, 4, 5]);
results.forEach(r => {
  console.log(`Table ${r.tableId}: ${r.url}`);
  console.log('PNG Base64:', r.png.substring(0, 50) + '...');
});
```

---

## Database Schema

### Tables Table

```sql
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  section VARCHAR(100),
  capacity INT,
  status VARCHAR(50) DEFAULT 'available',  -- available, occupied, maintenance
  qr_code_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table (With Table Reference)

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_id INT REFERENCES tables(id),
  user_id UUID REFERENCES users(id),
  items JSONB,
  total_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, preparing, ready, served, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Staff Calls Table

```sql
CREATE TABLE staff_calls (
  id SERIAL PRIMARY KEY,
  table_id INT REFERENCES tables(id),
  reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, acknowledged, resolved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

### QR Code Tokens Table (Optional - for dynamic routing)

```sql
CREATE TABLE qr_tokens (
  id SERIAL PRIMARY KEY,
  table_id INT REFERENCES tables(id),
  token VARCHAR(100) UNIQUE,
  qr_url VARCHAR(500),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Error Handling

### Common Error Responses

**Invalid Table ID:**
```json
{
  "error": "Invalid table ID",
  "statusCode": 400
}
```

**Table Not Found:**
```json
{
  "error": "Table not found",
  "statusCode": 404
}
```

**Unauthorized (Admin required):**
```json
{
  "error": "Admin access required",
  "statusCode": 403
}
```

**Server Error:**
```json
{
  "error": "Failed to generate QR codes",
  "details": "Error message here",
  "statusCode": 500
}
```

### Error Handling in Client

```javascript
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Unknown error');
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error.message);
    showErrorNotification(error.message);
    throw error;
  }
}

// Usage
try {
  const tableData = await safeFetch(`/api/tables/${tableId}`);
} catch (error) {
  // Error already handled and displayed
}
```

---

## Performance Optimization

### QR Code Generation Performance

```javascript
// Batch generation with concurrency control
async function generateBatch(tableIds, concurrency = 5) {
  const batches = [];
  for (let i = 0; i < tableIds.length; i += concurrency) {
    batches.push(tableIds.slice(i, i + concurrency));
  }

  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(tableId => generateTableQR(tableId, 'https://yourdomain.com'))
    );
    results.push(...batchResults);
  }

  return results;
}
```

### Caching

```javascript
// Cache QR config in memory
const qrConfigCache = {
  data: null,
  timestamp: null,
  ttl: 3600000  // 1 hour

  async get() {
    const now = Date.now();
    if (this.data && (now - this.timestamp) < this.ttl) {
      return this.data;
    }

    const config = await getQRConfig();
    this.data = config;
    this.timestamp = now;
    return config;
  }
};
```

### CDN Serving

```javascript
// Serve QR codes from CDN
const qrCodeUrl = (tableId, format = 'png') => {
  return `https://cdn.yourdomain.com/qr-codes/table_${tableId}_qr.${format}`;
};
```

---

## Security

### Input Validation

```javascript
// Validate table ID
function validateTableId(tableId) {
  const id = parseInt(tableId, 10);
  
  if (isNaN(id) || id < 1 || id > 10000) {
    throw new Error('Invalid table ID');
  }
  
  return id;
}

// Usage
try {
  const tableId = validateTableId(req.params.tableId);
} catch (error) {
  res.status(400).json({ error: error.message });
}
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Limit QR generation
const qrGenerationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests
  message: 'Too many QR generation requests'
});

app.post('/api/qr/generate', qrGenerationLimit, async (req, res) => {
  // ... implementation
});
```

### HTTPS Requirement

```javascript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect(`https://${req.get('host')}${req.url}`);
}
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

---

## Monitoring & Logging

### QR Generation Logging

```javascript
function logQRGeneration(tableId, format, success, duration) {
  const log = {
    timestamp: new Date().toISOString(),
    action: 'qr_generation',
    tableId,
    format,
    success,
    durationMs: duration
  };

  console.log('[QR]', JSON.stringify(log));
}
```

### Table Access Logging

```javascript
app.get('/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;
  
  // Log access
  console.log(`[TABLE_ACCESS] Table ${tableId} - IP: ${req.ip} - Time: ${new Date().toISOString()}`);
  
  // ... rest of implementation
});
```

---

## Testing

### Unit Tests (Jest)

```javascript
// __tests__/qr.test.js
describe('QR Code Generation', () => {
  test('should generate valid URL', () => {
    const tableId = 1;
    const domain = 'https://test.com';
    const url = generateTableUrl(tableId, domain);
    
    expect(url).toBe('https://test.com/tables/1');
  });

  test('should validate table ID', () => {
    expect(() => validateTableId(-1)).toThrow();
    expect(() => validateTableId(0)).toThrow();
    expect(() => validateTableId(10001)).toThrow();
    expect(() => validateTableId(50)).not.toThrow();
  });
});
```

### Integration Tests

```javascript
// Test full flow
describe('QR Code API Integration', () => {
  test('should generate, validate, and serve QR codes', async () => {
    // Generate
    const genResponse = await request(app)
      .post('/api/qr/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableIds: [1], domain: 'https://test.com' });
    
    expect(genResponse.status).toBe(200);
    expect(genResponse.body.results[0].url).toBe('https://test.com/tables/1');
    
    // Validate
    const valResponse = await request(app)
      .post('/api/qr/validate')
      .send({ url: 'https://test.com/tables/1' });
    
    expect(valResponse.status).toBe(200);
    expect(valResponse.body.valid).toBe(true);
  });
});
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-06-05
