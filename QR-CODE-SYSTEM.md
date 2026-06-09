# 🏨 QR Code System for Zawai Hotel

A production-ready QR code generation and management system for the hotel table ordering platform.

## Overview

This system allows you to generate unique QR codes for each table in your hotel. When guests scan a table's QR code with their phone, they're instantly directed to the table's menu page where they can place orders.

**Key Features:**
- ✅ High-resolution QR codes (1000x1000px minimum)
- ✅ Dual format support (PNG for printing, SVG for scaling)
- ✅ Error correction level Q for real-world durability
- ✅ Quiet zone (4 modules) for better scannability
- ✅ Batch generation for multiple tables
- ✅ QR code validation
- ✅ Automatic URL encoding
- ✅ Optional logo embedding
- ✅ Scalable architecture for adding new tables

## 📱 Complete QR Code Flow

Here's the complete user journey from scanning to order delivery:

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

### Flow Breakdown

1. **QR Scan** - Guest uses phone camera to scan table's QR code
2. **Route** - Browser navigates to `/tables/5` (Table 5 in this example)
3. **Session** - Server creates unique session for Table 5
4. **Menu** - Table-specific menu page loads with session info
5. **Order** - Customer selects items and places order
6. **Save** - Order saved to database, linked to table session
7. **Notify** - Kitchen dashboard receives real-time order notification
8. **Track** - Order status updates: Pending → Preparing → Ready → Served → Paid

## Files Overview

### Core Files

| File | Purpose |
|------|---------|
| `scripts/generate-qr-codes.js` | Main QR generation script |
| `scripts/example-generate-qr.js` | Quick start example |
| `server.js` | Server routes (updated with `/tables/{id}` and API endpoints) |
| `table-template.html` | Template for table menu pages |

### Generated Files

After running the generator, files are created in `./qr-codes/`:
- `table_1_qr.png` - PNG format QR code
- `table_1_qr.svg` - SVG format QR code
- `table_1_qr_with_logo.png` - PNG with logo (optional)
- `manifest.json` - Metadata for all generated QR codes
- `qr-config.json` - Configuration used for generation

## Installation

### 1. Install Dependencies

```bash
npm install
```

The following packages are used:
- **qrcode**: QR code generation
- **sharp**: Image processing (for logo embedding)

### 2. Verify Setup

```bash
node -e "require('qrcode'); console.log('✓ qrcode package OK')"
node -e "require('sharp'); console.log('✓ sharp package OK')"
```

## Usage

### Quick Start: Generate QR Codes for Tables 1-5

```bash
node scripts/example-generate-qr.js
```

This generates QR codes for 5 tables at the default domain (`https://yourdomain.com`).

### Advanced: Custom Configuration

```bash
node scripts/generate-qr-codes.js \
  --tables 1-100 \
  --domain https://myhotel.com \
  --output ./public/qr-codes \
  --format png,svg
```

### Command-Line Options

| Option | Example | Description |
|--------|---------|-------------|
| `--tables` | `1-100` or `1,5,10` | Tables to generate |
| `--domain` | `https://hotel.com` | Base domain (default: from .env) |
| `--output` | `./qr-codes` | Output directory |
| `--logo` | `./logo.png` | Logo file for embedding |
| `--format` | `png,svg` | Output formats (default: both) |
| `--help` | - | Show help message |

### Examples

**Generate QR codes for 50 tables:**
```bash
node scripts/generate-qr-codes.js --tables 1-50
```

**Generate only PNG format:**
```bash
node scripts/generate-qr-codes.js --tables 1-100 --format png
```

**Generate with custom domain:**
```bash
node scripts/generate-qr-codes.js --tables 1-20 --domain https://myzawai.com
```

**Generate with logo embedding:**
```bash
node scripts/generate-qr-codes.js --tables 1-30 --logo ./assets/hotel-logo.png
```

**Generate specific tables (non-sequential):**
```bash
node scripts/generate-qr-codes.js --tables 1,3,5,7,9
```

## API Endpoints

The server provides several API endpoints for QR code management:

### 1. Serve Table Page
```
GET /tables/:tableId
```

Serves the table menu page when a QR code is scanned.

**Example:**
```
https://yourdomain.com/tables/1
https://yourdomain.com/tables/42
```

**Response:** HTML page with table number and menu interface

### 2. Generate QR Codes (Admin Only)
```
POST /api/qr/generate
```

Generate QR codes on demand via API.

**Request:**
```json
{
  "tableIds": [1, 2, 3],
  "domain": "https://yourdomain.com",
  "formats": ["png", "svg"]
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "domain": "https://yourdomain.com",
  "results": [
    {
      "tableId": 1,
      "url": "https://yourdomain.com/tables/1",
      "generated": "2026-06-05T...",
      "png": "base64...",
      "svg": "<svg>...</svg>"
    }
  ]
}
```

### 3. Validate QR Code
```
POST /api/qr/validate
```

Validate that a QR code correctly decodes to the expected URL.

**Request:**
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
```
GET /api/qr/config
```

Get current QR code system configuration.

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

### 5. Get Table Info
```
GET /api/tables/:tableId
```

Get information about a specific table.

**Response:**
```json
{
  "id": 1,
  "status": "available",
  "capacity": 4,
  "created_at": "2026-06-05T...",
  "updated_at": "2026-06-05T..."
}
```

## URL Structure

All QR codes follow this pattern:

```
https://{domain}/tables/{table_id}
```

Examples:
- `https://yourdomain.com/tables/1`
- `https://yourdomain.com/tables/42`
- `https://yourdomain.com/tables/100`

## QR Code Specifications

### Technical Details

| Specification | Value | Notes |
|---------------|-------|-------|
| **Format** | PNG, SVG | PNG for printing, SVG for web scaling |
| **Resolution** | 1000x1000 pixels | High enough for printing without quality loss |
| **Version** | Auto | Determined by data size |
| **Error Correction** | Q (25%) | Robust against damage/dirt |
| **Quiet Zone** | 4 modules | White border around QR code |
| **Color** | Black on white | Standard, high contrast |
| **Content** | URL only | No extra JSON or metadata |

### Error Correction Levels

| Level | Capacity | Use Case |
|-------|----------|----------|
| L (7%) | Maximum | Documents without physical stress |
| **M (15%)** | Good | Most general use |
| **Q (25%)** | Better | Outdoor/printed materials (our choice) |
| H (30%) | Minimum | Heavily damaged/partially obscured |

We use **Q** for optimal real-world performance in hotel environments.

## File Formats

### PNG Format
- **Best for:** Printing
- **Size:** ~1000x1000 pixels
- **Quality:** Lossless
- **Use case:** Print and laminate for physical tables

**Printing recommendations:**
- Minimum size: 2cm × 2cm
- Recommended size: 5cm × 5cm (2 inches)
- Print on high-quality paper
- Laminate for durability

### SVG Format
- **Best for:** Web/Digital
- **Scalable:** Yes, infinite resolution
- **Size:** Text-based (typically 5-50 KB)
- **Use case:** Web display, email, digital menus

**Benefits:**
- Scale to any size without pixelation
- Smaller file size
- Easy to customize with CSS

## Logo Embedding (Optional)

Embed your hotel logo in the center of QR codes:

```bash
node scripts/generate-qr-codes.js \
  --tables 1-20 \
  --logo ./assets/hotel-logo.png
```

**Requirements:**
- Logo file: PNG, JPG, or SVG
- Size: Will be resized to 25% of QR code
- Visibility: Should be recognizable at 25% size

**Outcome:**
- Generated as: `table_X_qr_with_logo.png`
- Logo is placed on white background in center
- QR code remains fully scannable

## Batch Processing

### Generate Large Quantities

For 100 tables:
```bash
node scripts/generate-qr-codes.js --tables 1-100
```

**Performance:**
- ~100 tables: < 5 seconds
- 1000 tables: ~30-40 seconds
- Depends on system resources

### Output Organization

After generation, you'll find:
```
qr-codes/
├── table_1_qr.png
├── table_1_qr.svg
├── table_2_qr.png
├── table_2_qr.svg
├── ... (more tables)
├── manifest.json          # Complete list of generated files
├── qr-config.json         # Configuration used
```

## Configuration Management

### Environment Variables

Set in `.env`:

```env
# Base domain for QR codes
BASE_DOMAIN=https://yourdomain.com

# Optional: Default output directory
QR_OUTPUT_DIR=./qr-codes

# Optional: Default logo path
QR_LOGO_PATH=./assets/logo.png
```

### Runtime Configuration

Modify `generate-qr-codes.js` constants:

```javascript
const CONFIG = {
  BASE_DOMAIN: process.env.BASE_DOMAIN || 'https://yourdomain.com',
  OUTPUT_DIR: './qr-codes',
  RESOLUTION: 1000,
  ERROR_CORRECTION: 'Q',
  QUIET_ZONE: 4,
  INCLUDE_LOGO: false,
  LOGO_PATH: null,
  LOGO_SIZE_RATIO: 0.25,
};
```

## Workflow: Setup to Deployment

### 1. Development

```bash
# Generate test QR codes for tables 1-5
node scripts/example-generate-qr.js

# Test by scanning with your phone
# Visit: http://localhost:3000/tables/1
```

### 2. Pre-Production

```bash
# Generate for your actual table count
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --domain https://yourdomain.com \
  --logo ./assets/logo.png
```

### 3. Printing

1. Open `qr-codes/table_X_qr.png` in your browser or image editor
2. Print at 5cm × 5cm (2 inches) minimum
3. Use high-quality paper or sticker material
4. Laminate for durability in dining environment

### 4. Deployment

1. Deploy updated `server.js` to production
2. Update `.env` with your production domain
3. Regenerate QR codes for production domain:
   ```bash
   node scripts/generate-qr-codes.js --tables 1-50 --domain https://production-domain.com
   ```
4. Place laminated QR codes on tables
5. Test scanning from production domain

## Troubleshooting

### QR Code Not Scanning

**Symptoms:** Phone camera won't recognize the QR code

**Solutions:**
1. Check print quality (avoid fading or blur)
2. Ensure lighting is adequate
3. Clean any protection layer (if laminated)
4. Try different camera apps
5. Regenerate with `--format svg` and test digitally first

### Wrong URL Encoding

**Symptoms:** Scanning opens incorrect page

**Check:**
1. Verify `--domain` flag in generation command
2. Check `.env` BASE_DOMAIN variable
3. Regenerate with explicit domain:
   ```bash
   node scripts/generate-qr-codes.js --domain https://yourdomain.com
   ```

### Permission Issues

**Symptoms:** Cannot write to output directory

**Solutions:**
```bash
# Fix permissions
chmod -R 755 ./qr-codes

# Or create directory manually
mkdir -p ./qr-codes
chmod 755 ./qr-codes
```

### Module Not Found

**Symptoms:** `Cannot find module 'qrcode'`

**Solution:**
```bash
npm install
npm install qrcode sharp
```

## Advanced: Regeneration

### Update Domain (All Tables)

When changing domain:

```bash
node scripts/generate-qr-codes.js \
  --tables 1-50 \
  --domain https://new-domain.com
```

Generates all new QR codes with updated URLs. Replace old codes with new ones.

### Add New Tables

When adding more tables:

```bash
# Add tables 51-100
node scripts/generate-qr-codes.js --tables 51-100
```

New files are created, old ones remain unchanged.

### Selective Regeneration

For specific tables:

```bash
node scripts/generate-qr-codes.js --tables 5,10,15,20
```

## Manifest & Validation

After generation, `manifest.json` contains:

```json
{
  "generatedAt": "2026-06-05T10:30:00.000Z",
  "domain": "https://yourdomain.com",
  "totalTables": 5,
  "successCount": 5,
  "failureCount": 0,
  "validatedCount": 5,
  "tables": [
    {
      "tableId": 1,
      "url": "https://yourdomain.com/tables/1",
      "pngFile": "table_1_qr.png",
      "svgFile": "table_1_qr.svg"
    }
  ]
}
```

Use this for:
- Auditing what was generated
- Batch processing tracking
- Validation reports

## Integration Examples

### Frontend: Link to QR

```html
<!-- Display table QR code on admin panel -->
<img src="/qr-codes/table_5_qr.png" alt="Table 5 QR Code" width="200">
```

### API: Generate on Demand

```javascript
// Generate QR codes for new tables
const response = await fetch('/api/qr/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableIds: [51, 52, 53],
    domain: 'https://yourdomain.com',
    formats: ['png', 'svg']
  })
});

const { results } = await response.json();
results.forEach(r => {
  console.log(`Table ${r.tableId}: ${r.url}`);
});
```

### Validation: Check QR

```javascript
// Validate a QR code URL
const isValid = await fetch('/api/qr/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://yourdomain.com/tables/1'
  })
}).then(r => r.json());

console.log(isValid.valid); // true/false
```

## Security Considerations

1. **URL Format:** URLs are predictable (`/tables/1`, `/tables/2`, etc.)
   - This is by design for easy QR code generation
   - Add authentication if sensitive data is required

2. **Access Control:** Table pages are publicly accessible
   - Consider adding rate limiting
   - Add CSRF protection for order submission

3. **Scanning:** Anyone can scan and access
   - Design UI accordingly (e.g., "call for service" messaging)
   - Don't expose sensitive backend data on table pages

4. **Domain Security:** QR codes must use HTTPS in production
   - Ensure `BASE_DOMAIN` uses `https://`
   - QR code readers require valid SSL certificate

## Performance

### Generation Speed

| Tables | Time | Notes |
|--------|------|-------|
| 1 | <100ms | Single table |
| 10 | <1s | Quick start example |
| 100 | ~5s | Single batch |
| 1000 | ~30s | Large batch |

### File Sizes

| Format | 1 Table | 100 Tables | 1000 Tables |
|--------|---------|------------|-------------|
| PNG | ~1 KB | ~100 KB | ~1 MB |
| SVG | ~5 KB | ~500 KB | ~5 MB |

### Disk Requirements

```
100 tables (PNG + SVG): ~600 KB
1000 tables (PNG + SVG): ~6 MB
```

## Browser Compatibility

### QR Code Scanning

| Browser | Mobile | Desktop |
|---------|--------|---------|
| Safari | ✅ Built-in camera | - |
| Chrome | ✅ Google Lens | - |
| Firefox | ✅ QR Scanner app | ✅ Extensions |
| Edge | ✅ Native support | - |

### Table Page Display

All modern browsers (2020+):
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

## Maintenance

### Regular Tasks

**Weekly:**
- Test a few QR codes to ensure links work
- Monitor scanning issues

**Monthly:**
- Check QR code physical condition (fading, damage)
- Verify database table count matches QR codes

**When Adding Tables:**
```bash
node scripts/generate-qr-codes.js --tables 101-150
```

**When Changing Domain:**
```bash
node scripts/generate-qr-codes.js --tables 1-150 --domain https://new-domain.com
```

## Support & Debugging

### Enable Debug Logging

```javascript
// In generate-qr-codes.js
const DEBUG = true;

if (DEBUG) {
  console.log('Generating for:', config);
  console.log('Table range:', tableIds);
}
```

### Test Endpoint

```bash
# Test health
curl http://localhost:3000/api/health

# Get QR config
curl http://localhost:3000/api/qr/config

# Test table page
curl http://localhost:3000/tables/1
```

### Validate Single QR

```bash
# Create a test QR code for table 1
node scripts/generate-qr-codes.js --tables 1 --output ./test-qr

# Open test-qr/table_1_qr.svg in browser
# Scan with phone to verify
```

## FAQ

**Q: Can I change the QR code size after printing?**
A: Yes, use SVG format for unlimited scaling. PNG is fixed at 1000x1000px.

**Q: What if a QR code gets damaged?**
A: Error correction level Q allows up to 25% damage. If beyond repair, regenerate and replace.

**Q: Can I add more tables later?**
A: Yes! Generate only new tables or regenerate all with the full range.

**Q: Is there a limit to the number of tables?**
A: No practical limit. System scales to thousands of tables.

**Q: Can I customize the table page design?**
A: Yes, modify `table-template.html` and server routes in `server.js`.

**Q: What happens if I change the domain?**
A: Old QR codes will still work if the old domain redirects to new domain. Otherwise, regenerate and replace all codes.

## Next Steps

1. **Install dependencies:** `npm install`
2. **Generate test QR codes:** `node scripts/example-generate-qr.js`
3. **Test scanning:** Point phone camera at printed QR code
4. **Deploy server:** Updated `server.js` has new routes
5. **Print & deploy:** Use PNG format for printing

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-05 | Initial release |

## License

ISC

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review example scripts
3. Check manifest.json for generation details

---

**Last Updated:** 2026-06-05
