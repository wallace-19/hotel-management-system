#!/usr/bin/env node

/**
 * Example: Generate QR Codes for Tables 1-5
 * 
 * This is a quick example to generate QR codes for the first 5 tables.
 * For production use, modify the parameters as needed.
 * 
 * Usage:
 * node scripts/example-generate-qr.js
 * 
 * Or with custom options:
 * node scripts/example-generate-qr.js --domain https://myhotel.com --tables 1-100
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const config = {
  // Change this to your actual domain
  domain: process.env.BASE_DOMAIN || 'https://yourdomain.com',
  
  // Number of tables to generate
  tables: '1-5',
  
  // Output directory
  output: './public/qr-codes',
  
  // Include logo (optional)
  logo: null,
  
  // Formats to generate
  formats: 'png,svg',
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║         🏨 QR Code Batch Generation Example               ║
╠════════════════════════════════════════════════════════════╣
║ This script generates QR codes for your hotel tables       ║
║ Each QR code will link to the table's ordering page        ║
╚════════════════════════════════════════════════════════════╝
`);

// Build command arguments
const args = [
  path.join(__dirname, 'generate-qr-codes.js'),
];

// Add configuration to arguments
if (config.tables) {
  args.push('--tables', config.tables);
}
if (config.domain) {
  args.push('--domain', config.domain);
}
if (config.output) {
  args.push('--output', config.output);
}
if (config.formats) {
  args.push('--format', config.formats);
}
if (config.logo) {
  args.push('--logo', config.logo);
}

console.log('Configuration:');
console.log(`  Domain: ${config.domain}`);
console.log(`  Tables: ${config.tables}`);
console.log(`  Output: ${config.output}`);
console.log(`  Formats: ${config.formats}`);
console.log(`  Logo: ${config.logo ? config.logo : '(none)'}`);
console.log('');

// Run the generator
const generator = spawn('node', args, {
  stdio: 'inherit',
  shell: true,
});

generator.on('close', (code) => {
  if (code === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ Generation Complete!                                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║ Your QR codes are ready!                                  ║
║                                                            ║
║ 📁 Files saved to: ${config.output}                ║
║                                                            ║
║ Next steps:                                               ║
║ 1. Print the QR codes (PNG format recommended)            ║
║ 2. Laminate or frame them for durability                  ║
║ 3. Place one QR code on each table                        ║
║ 4. Test scanning with your device                         ║
║                                                            ║
║ 🔗 Access URLs:                                           ║
║ - Example: ${config.domain}/tables/1                   ║
║ - Example: ${config.domain}/tables/2                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  } else {
    console.error('\n❌ Generation failed!');
    process.exit(1);
  }
});

generator.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
