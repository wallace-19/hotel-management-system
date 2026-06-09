# Zawai Hotel QR Ordering System

A local hotel/restaurant point-of-sale and table-ordering system with QR code table links, Supabase backend storage, Firebase authentication, Stripe payments, Twilio SMS, Resend email, and M-PESA integration support.

## Features

- QR code generation for table-based ordering
- Table menu route at `/tables/:id`
- Supabase-backed booking, orders, staff, and payments tables
- Firebase Admin auth for backend protection
- Stripe card payments with webhook validation
- M-PESA STK Push payment support
- Resend email notifications
- Twilio SMS notifications
- Staff login and password reset flow

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Copy the example environment file and update values

```bash
cp .env.example .env
```

3. Update `.env` with your credentials.

The repo includes `.env.example` with all required keys. Use that file as a template and set your real values.

### Important values
Use these placeholders in your `.env` file as a starting point:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
APP_URL=http://localhost:3000
BASE_DOMAIN=http://localhost:3000

FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
FIREBASE_PROJECT_ID_FRONTEND=your-firebase-project-id
FIREBASE_APP_ID=your-firebase-app-id
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
FIREBASE_WEB_API_KEY=your_firebase_web_api_key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=no-reply@yourdomain.com
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

MPESA_ENABLED=false
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
```

4. Start the server

```bash
npm start
```

5. Visit the app

```text
http://localhost:3000
```

## Generate QR Codes

Use the QR generation script to create table QR assets:

```bash
node scripts/generate-qr-codes.js --tables 1-100 --domain http://localhost:3000 --output ./qr-codes
```

For a quick test set:

```bash
node scripts/example-generate-qr.js
```

## Seed Test Staff

Create or update a staff account:

```bash
node scripts/insert_test_staff.js
```

Default seeded credentials:

- Email: `wally@example.com`
- Password: `#Wally123`

## Useful Endpoints

- `GET /api/health`
- `GET /api/config`
- `GET /tables/:id`
- `POST /api/staff/login`
- `POST /api/notifications/email`
- `POST /api/notifications/sms`
- `POST /api/mpesa/pay`
- `POST /webhooks/stripe`

## Notes

- The server uses `express` and `dotenv` for configuration.
- `server.js` expects Firebase Admin and Supabase credentials in `.env`.
- Stripe webhooks require `STRIPE_WEBHOOK_SECRET` and the `/webhooks/stripe` route.
- M-PESA requires a public callback URL configured in `MPESA_CALLBACK_URL`.

## Deployment

- For production, use a real HTTPS domain and update `APP_URL` and `BASE_DOMAIN`.
- Keep `.env` secret and do not commit it to GitHub.
- Configure Stripe webhooks in the Stripe Dashboard to point at `/webhooks/stripe`.
- If you enable M-PESA, the callback URL must be publicly reachable and match `MPESA_CALLBACK_URL`.
- Verify that Supabase and Firebase credentials are correct before deploying.

## Documentation

See the repo docs for additional details:

- `README-QR-SYSTEM.md`
- `QR-CODE-SYSTEM.md`
- `QR-QUICK-START.md`
- `QR-TECHNICAL-REFERENCE.md`

## License

ISC
