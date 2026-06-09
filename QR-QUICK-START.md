# 🚀 QR Code System - Quick Start Guide

Welcome to the Zawai Hotel QR Code Generation System! This guide will get you up and running in minutes.

## � QR Code Flow - How It Works

```
     📱 QR Scan
        ↓
     /tables/5
        ↓
  Backend creates session
        ↓
   Menu loads
        ↓
  Customer orders
        ↓
Order saved under session
        ↓
Kitchen dashboard receives order
        ↓
Status updates (preparing → served → paid)
```

**The Complete Journey:**
When a guest scans a QR code, a session is created for that table, the menu loads, they can place orders, and the kitchen gets real-time notifications with status tracking.

---

## �📋 Table of Contents

1. [Installation](#installation)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Common Commands](#common-commands)
4. [Testing Your QR Codes](#testing-your-qr-codes)
5. [Printing & Deployment](#printing--deployment)
6. [File Structure](#file-structure)

---

## Installation

### Prerequisites
- Node.js v14+ installed
- npm installed

### Setup Steps

1. **Navigate to project directory:**
   ```bash
   cd /home/wally/Desktop/zawai\ hotel
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify installation:**
   ```bash
   node -e "require('qrcode'); console.log('✓ QR Code library ready')"
   ```

---

## Quick Start (5 Minutes)

### Generate Example QR Codes

The quickest way to see it in action:

```bash
node scripts/example-generate-qr.js
```

This generates QR codes for tables 1-5. Output appears in `./qr-codes/`

**Output:**
```
✓ Created output directory: ./qr-codes
📱 Generating QR codes for 5 table(s)...
✓ Table 1 PNG
✓ Table 1 SVG
... (more tables)
✅ Generation complete!
```

### Verify Files

List the generated files:
```bash
ls -la qr-codes/
```

**Files created:**
- `table_1_qr.png` - High-res PNG for printing
- `table_1_qr.svg` - Scalable SVG for web
- `table_2_qr.png`, `table_2_qr.svg` ... (for each table)
- `manifest.json` - Complete file listing
- `qr-config.json` - Configuration used

### Test in Browser

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   - Local: `http://localhost:3000/tables/1`
   - Production: `https://yourdomain.com/tables/1`

3. **Scan a QR code:**
   - Use your phone's camera app
   - Point at printed QR code (or display on screen)
   - Should open the table page

---

## Common Commands

### 1. Generate QR Codes for All Tables (1-50)

```bash
node scripts/generate-qr-codes.js --tables 1-50
```

### 2. Generate with Custom Domain

```bash
node scripts/generate-qr-codes.js \
  --tables 1-100 \
  --domain https://myhotel.com
```

### 3. Generate Only PNG (Smaller File Size)

```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --format png
```

### 4. Generate Only SVG (For Web)

```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --format svg
```

### 5. Generate Specific Tables

```bash
# Non-sequential tables
node scripts/generate-qr-codes.js --tables 1,5,10,15,20

# Combined ranges
node scripts/generate-qr-codes.js --tables 1-10,20-30,50-60
```

### 6. Generate with Custom Output Directory

```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --output ./public/qr-codes
```

### 7. Generate with Logo (Branding)

```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --logo ./assets/hotel-logo.png
```

### 8. Show Help

```bash
node scripts/generate-qr-codes.js --help
```

---

## Testing Your QR Codes

### Method 1: Print & Scan

1. **Print a QR code:**
   ```bash
   # On Linux/Mac
   open qr-codes/table_1_qr.png
   
   # On Windows
   start qr-codes\table_1_qr.png
   ```

2. **Print to paper (recommended size: 5cm × 5cm)**

3. **Scan with your phone camera**

### Method 2: Display & Scan

1. **Open in browser:**
   ```bash
   # Linux/Mac
   open qr-codes/table_1_qr.svg
   
   # Windows
   start qr-codes\table_1_qr.svg
   ```

2. **Scan from screen with your phone**

### Method 3: API Test

```bash
# Test QR generation API
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"tableIds": [1,2,3]}'

# Get QR configuration
curl http://localhost:3000/api/qr/config

# Test table page
curl http://localhost:3000/tables/1
```

---

## Printing & Deployment

### Print Settings

**Recommended:**
- Size: 5cm × 5cm (2 inches)
- Quality: High resolution (300 DPI)
- Paper: Matte or semi-gloss
- Color: Black on white

**Print Command (Linux/Mac):**
```bash
# Batch print tables 1-20
for i in {1..20}; do
  echo "Printing table $i..."
  # Your print command here
done
```

### Lamination

- **Material:** Clear laminating sheets or laminator
- **Purpose:** Protects QR code from:
  - Water/spills
  - UV fading
  - Physical wear
  - Dirt/fingerprints

### Placement

1. **On each table:** Center or corner of table
2. **Frame it:** Use a small frame (5x5cm) for durability
3. **Or:** Laminate and tape to table

### Testing After Deployment

```bash
# From phone, scan a table QR code
# Should show: https://yourdomain.com/tables/{number}

# Test all tables (sample)
for table in 1 5 10 20 50; do
  echo "Table $table: https://yourdomain.com/tables/$table"
done
```

---

## File Structure

After generating QR codes, your structure looks like:

```
zawai-hotel/
├── qr-codes/                    # Generated QR codes
│   ├── table_1_qr.png          # PNG format (for printing)
│   ├── table_1_qr.svg          # SVG format (for web)
│   ├── table_2_qr.png
│   ├── table_2_qr.svg
│   ├── ... (more tables)
│   ├── manifest.json            # File listing & metadata
│   └── qr-config.json           # Generation configuration
├── scripts/
│   ├── generate-qr-codes.js     # Main generator script
│   └── example-generate-qr.js   # Quick start example
├── server.js                    # Updated with table routes
├── table-template.html          # Table page template
├── QR-CODE-SYSTEM.md           # Full documentation
├── package.json                 # Updated dependencies
└── ... (other files)
```

---

## Real-World Workflow

### Day 1: Setup
```bash
# Install dependencies
npm install

# Generate test QR codes for tables 1-10
node scripts/example-generate-qr.js

# Review generated files
ls qr-codes/
```

### Day 2: Customize
```bash
# Update domain in .env or command
export BASE_DOMAIN="https://myhotel.com"

# Generate for your table count (e.g., 50 tables)
node scripts/generate-qr-codes.js --tables 1-50 --domain https://myhotel.com

# Optional: Add logo
node scripts/generate-qr-codes.js --tables 1-50 --logo ./assets/logo.png
```

### Day 3: Print & Test
```bash
# Print the PNG files
for i in {1..50}; do
  # Print qr-codes/table_${i}_qr.png
done

# Test scanning before deployment
npm start
# Scan QR codes with phone
# Should see table pages at http://localhost:3000/tables/X
```

### Day 4: Deploy
```bash
# Deploy server with updated server.js
git push production main

# Place laminated QR codes on tables
# Test production scanning
# https://myhotel.com/tables/1 (should work)
```

---

## Troubleshooting

### "Module not found: qrcode"
```bash
npm install qrcode sharp
```

### "Permission denied" when generating
```bash
chmod -R 755 ./qr-codes
chmod u+x scripts/generate-qr-codes.js
```

### QR code won't scan
- Ensure print quality is high
- Clean lamination surface
- Test with different phones/apps
- Check that code isn't faded

### Wrong URL in QR code
```bash
# Regenerate with correct domain
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --domain https://correct-domain.com
```

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Generate test QR codes: `node scripts/example-generate-qr.js`
3. ✅ Review files: `ls qr-codes/`
4. ✅ Test in browser: `npm start` then visit `http://localhost:3000/tables/1`
5. ✅ Print QR codes from `qr-codes/table_X_qr.png`
6. ✅ Laminate for durability
7. ✅ Place on tables
8. ✅ Test scanning in production

---

## API Quick Reference

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/tables/:tableId` | GET | View table menu | Public |
| `/api/qr/generate` | POST | Generate QR codes | Admin |
| `/api/qr/validate` | POST | Validate QR URL | Public |
| `/api/qr/config` | GET | Get QR config | Public |
| `/api/tables/:tableId` | GET | Get table info | Public |

---

## Support

**For detailed information, see:** [QR-CODE-SYSTEM.md](QR-CODE-SYSTEM.md)

**Quick help:**
```bash
node scripts/generate-qr-codes.js --help
```

---

## Examples

### Example 1: Generate for Small Hotel (10 tables)
```bash
node scripts/generate-qr-codes.js \
  --tables 1-10 \
  --domain https://myhotel.com \
  --format png,svg
```

### Example 2: Generate for Large Hotel (200 tables)
```bash
node scripts/generate-qr-codes.js \
  --tables 1-200 \
  --domain https://myhotel.com \
  --format png
```

### Example 3: Add New Tables Later
```bash
# Original generation (tables 1-50)
node scripts/generate-qr-codes.js --tables 1-50

# Later, add more tables (51-100)
node scripts/generate-qr-codes.js --tables 51-100
```

### Example 4: Regenerate with New Domain
```bash
# Migrate to new domain
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --domain https://new-domain.com
```

### Example 5: Generate with Branding
```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --domain https://myhotel.com \
  --logo ./assets/hotel-logo.png
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-06-05  
**Status:** Production Ready ✅
