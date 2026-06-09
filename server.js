const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const twilio = require('twilio');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let firebaseAuthEnabled = false;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });
  firebaseAuthEnabled = true;
} else {
  console.warn('Firebase Auth is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to .env');
}

app.use(cors({ origin: true }));

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(400).send('Stripe webhook is not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing Stripe signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook event received:', event.type);

  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      break;
    case 'payment_intent.payment_failed':
      console.warn('Payment failed:', event.data.object.id, event.data.object.last_payment_error?.message);
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes('$')) return false;
  const [salt, hash] = stored.split('$');
  const verify = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

async function syncUserToSupabase(decodedToken) {
  if (!decodedToken || !decodedToken.uid) return null;

  // Try to derive role from token/custom claims.
  // Common shapes:
  // - decodedToken.role (custom claim)
  // - decodedToken.custom_claims.role
  const tokenRole =
    decodedToken.role ||
    (decodedToken.custom_claims && decodedToken.custom_claims.role) ||
    null;

  // Preserve existing role if the user already exists.
  // This prevents "all users become customers" due to upsert.
  const { data: existingUser, error: existingErr } = await supabase
    .from('users')
    .select('id,role')
    .eq('firebase_uid', decodedToken.uid)
    .maybeSingle();

  if (existingErr) {
    console.error('Supabase user lookup error:', existingErr.message);
    return null;
  }

  const userData = {
    firebase_uid: decodedToken.uid,
    email: decodedToken.email || null,
    full_name: decodedToken.name || decodedToken.email || null,
    role: existingUser?.role || tokenRole || 'customer'
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'firebase_uid' })
    .select('*')
    .single();

  if (error) {
    console.error('Supabase user sync error:', error.message);
    return null;
  }
  return data;
}

async function verifyFirebaseToken(req, res, next) {
  if (!firebaseAuthEnabled) {
    return res.status(500).json({ error: 'Firebase Auth is not configured on the server.' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  const idToken = authHeader.slice(7);
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    req.supabaseUser = await syncUserToSupabase(decodedToken);
    return next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireAuth(req, res, next) {
  if (!req.user || !req.supabaseUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  const currentRole = req.supabaseUser?.role || null;
  if (!req.supabaseUser || currentRole !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      requiredRole: 'admin',
      currentRole,
      userId: req.supabaseUser?.id || null,
      firebaseClaims: req.user
        ? {
            role: req.user.role || null,
            customClaims: req.user.custom_claims || null
          }
        : null
    });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.get('/api/config', (req, res) => {
  res.json({
    stripeEnabled: !!stripe && !!stripePublishableKey,
    stripePublishableKey: stripePublishableKey || null,
    mpesaEnabled: !!process.env.MPESA_ENABLED && process.env.MPESA_ENABLED === 'true',
    twilioEnabled: !!twilioClient,
    resendEnabled: !!resend
  });
});

app.get('/api/auth/me', verifyFirebaseToken, requireAuth, (req, res) => {
  res.json({ user: req.supabaseUser });
});

app.post('/api/bookings', verifyFirebaseToken, requireAuth, async (req, res) => {
  const { tableId, partySize = 1, status = 'pending', totalAmount, note = '' } = req.body;
  if (!tableId || typeof totalAmount !== 'number') {
    return res.status(400).json({ error: 'tableId and totalAmount are required' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ user_id: req.supabaseUser.id, table_id: String(tableId), party_size: partySize, status, total_amount: totalAmount, notes: note }])
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.get('/api/bookings', verifyFirebaseToken, requireAuth, async (req, res) => {
  let query = supabase.from('bookings').select('*');
  if (req.supabaseUser.role !== 'admin') {
    query = query.eq('user_id', req.supabaseUser.id);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.get('/api/bookings/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  const bookingId = req.params.id;
  const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
  if (error || !data) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  if (req.supabaseUser.role !== 'admin' && data.user_id !== req.supabaseUser.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(data);
});

app.patch('/api/bookings/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  const bookingId = req.params.id;
  const updates = req.body;
  const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
  if (bookingError || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  if (req.supabaseUser.role !== 'admin' && booking.user_id !== req.supabaseUser.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data, error } = await supabase.from('bookings').update(updates).eq('id', bookingId).select('*').single();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.post('/api/payments/stripe/create-payment-intent', verifyFirebaseToken, requireAuth, async (req, res) => {
  if (!stripe || !stripePublishableKey) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }
  const { amount, currency = 'KES' } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount is required and must be a positive number' });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.supabaseUser.id }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// M-PESA helpers
function mpesaTimestamp() {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getMpesaAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
  if (!consumerKey || !consumerSecret) throw new Error('Missing MPESA consumer credentials');
  const tokenUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const r = await axios.get(tokenUrl, { headers: { Authorization: `Basic ${auth}` } });
  return r.data.access_token;
}

async function stkPush({ amount, phone, accountReference, transactionDesc }) {
  const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) throw new Error('Missing MPESA configuration (SHORTCODE/PASSKEY/CALLBACK_URL)');

  const timestamp = mpesaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const token = await getMpesaAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: String(phone).replace(/\D/g, ''),
    PartyB: shortcode,
    PhoneNumber: String(phone).replace(/\D/g, ''),
    CallBackURL: callbackUrl,
    AccountReference: accountReference || 'ZawaiHotel',
    TransactionDesc: transactionDesc || 'Payment'
  };

  const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;
  const r = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  return r.data;
}

app.post('/api/mpesa/pay', verifyFirebaseToken, requireAuth, async (req, res) => {
  const mpesaEnabled = !!process.env.MPESA_ENABLED && process.env.MPESA_ENABLED === 'true';
  if (!mpesaEnabled) {
    return res.status(501).json({ error: 'M-PESA integration not configured' });
  }

  const { amount, phone, accountReference, transactionDesc } = req.body || {};
  if (!amount || !phone) return res.status(400).json({ error: 'amount and phone are required' });

  try {
    const mpesaResponse = await stkPush({ amount, phone, accountReference, transactionDesc });
    res.json({ success: true, mpesa: mpesaResponse });
  } catch (e) {
    console.error('M-PESA error:', e.message || e);
    res.status(500).json({ error: e.message || 'M-PESA request failed' });
  }
});

app.post('/api/staff/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase
    .from('staff')
    .select('id,full_name,email,role,phone,password_hash')
    .eq('email', email)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!verifyPassword(password, data.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password_hash, ...staff } = data;
  res.json({ staff });
});

// Staff password reset request
app.post('/api/staff/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id,full_name,email')
    .eq('email', email)
    .single();

  if (staffErr || !staff) {
    // don't reveal whether email exists
    return res.json({ success: true });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('staff_password_resets')
    .insert([{ staff_id: staff.id, token, expires_at: expiresAt, used: false }])
    .select('*')
    .single();

  const resetUrl = `${appUrl}?view=staff-reset&token=${token}`;

  if (error) {
    console.error('Reset token insert error:', error.message);
    return res.status(500).json({ error: 'Failed to create reset token' });
  }

  // send email if Resend configured
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'no-reply@zawai-hotel.com',
        to: staff.email,
        subject: 'Reset your Zawai Hotel staff password',
        html: `<p>Hello ${staff.full_name || ''},</p><p>Click the link below to reset your staff account password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      });
    } catch (e) {
      console.error('Failed to send reset email:', e.message);
    }
  }

  // return the resetUrl for development convenience
  res.json({ success: true, resetUrl });
});

// Staff set new password using token
app.post('/api/staff/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });

  const { data: row, error: rowErr } = await supabase
    .from('staff_password_resets')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (rowErr || !row) return res.status(400).json({ error: 'Invalid or expired token' });

  const now = new Date();
  if (new Date(row.expires_at) < now) {
    await supabase.from('staff_password_resets').update({ used: true }).eq('id', row.id);
    return res.status(400).json({ error: 'Token expired' });
  }

  const password_hash = hashPassword(password);
  const { error: updErr } = await supabase.from('staff').update({ password_hash }).eq('id', row.staff_id);
  if (updErr) return res.status(500).json({ error: 'Failed to update password' });

  await supabase.from('staff_password_resets').update({ used: true }).eq('id', row.id);
  res.json({ success: true });
});

app.get('/api/staff', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('staff').select('id,full_name,email,role,phone,created_at');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.post('/api/staff', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const { full_name, email, role = 'staff', phone, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, and password are required' });
  }
  const password_hash = hashPassword(password);
  const { data, error } = await supabase
    .from('staff')
    .insert([{ full_name, email, role, phone, password_hash }])
    .select('id,full_name,email,role,phone,created_at')
    .single();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.patch('/api/staff/:id', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const staffId = req.params.id;
  const updates = { ...req.body };
  if (updates.password) {
    updates.password_hash = hashPassword(updates.password);
    delete updates.password;
  }
  const { data, error } = await supabase.from('staff').update(updates).eq('id', staffId).select('id,full_name,email,role,phone,created_at').single();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.delete('/api/staff/:id', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const staffId = req.params.id;
  const { error } = await supabase.from('staff').delete().eq('id', staffId);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.post('/api/notifications/email', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  if (!resend) {
    return res.status(500).json({ error: 'Resend is not configured' });
  }
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }
  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'no-reply@zawai-hotel.com',
      to,
      subject,
      html
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/sms', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio is not configured' });
  }
  const { to, body } = req.body;
  if (!to || !body) {
    return res.status(400).json({ error: 'to and body are required' });
  }
  try {
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menu CRUD endpoints (simple persistence via Supabase)
app.get('/api/menu', async (req, res) => {
  const { data, error } = await supabase.from('menu').select('*').order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/menu', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const { cat, emoji, name, desc, price, avail = true } = req.body || {};
  if (!name || typeof price === 'undefined') return res.status(400).json({ error: 'name and price are required' });
  const { data, error } = await supabase.from('menu').insert([{ cat, emoji, name, desc, price, avail }]).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.patch('/api/menu/:id', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const updates = req.body || {};
  const { data, error } = await supabase.from('menu').update(updates).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/menu/:id', verifyFirebaseToken, requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { error } = await supabase.from('menu').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/table-qrs', verifyFirebaseToken, requireAuth, async (req, res) => {
  const { tableId, expiresMinutes = 1440 } = req.body;
  if (!tableId) {
    return res.status(400).json({ error: 'tableId is required' });
  }

  const token = generateToken();
  const url = `${appUrl}/api/checkin/table/${token}`;
  const expiresAt = new Date(Date.now() + expiresMinutes * 60000).toISOString();

  const { data, error } = await supabase
    .from('table_qr_tokens')
    .insert([{ table_id: String(tableId), token, url, expires_at: expiresAt, active: true }])
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.get('/api/table-qrs/:tableId', verifyFirebaseToken, requireAuth, async (req, res) => {
  const { tableId } = req.params;
  const { data, error } = await supabase
    .from('table_qr_tokens')
    .select('*')
    .eq('table_id', String(tableId))
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'No active QR code found for this table' });
  }
  res.json(data[0]);
});

app.get('/api/checkin/table/:token', async (req, res) => {
  const { token } = req.params;
  const { data, error } = await supabase
    .from('table_qr_tokens')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Invalid or expired QR token' });
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < now) {
    await supabase
      .from('table_qr_tokens')
      .update({ active: false })
      .eq('token', token);
    return res.status(400).json({ error: 'Expired QR token' });
  }

  await supabase
    .from('table_qr_tokens')
    .update({ active: false })
    .eq('token', token);

  await supabase
    .from('table_checkins')
    .insert([{ table_id: data.table_id, token, checked_in_at: new Date().toISOString() }]);

  res.json({ success: true, tableId: data.table_id, checkedInAt: new Date().toISOString() });
});

// ============================================
// QR CODE SYSTEM ROUTES
// ============================================

// Serve table menu page when QR code is scanned
app.get('/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;

  // Validate table ID
  if (!tableId || isNaN(tableId)) {
    return res.status(400).json({ error: 'Invalid table ID' });
  }

  try {
    const parsedTableId = parseInt(tableId, 10);
    
    // Fetch table info from database (if exists)
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', parsedTableId)
      .single();

    // Create or retrieve session for this table
    // A session represents a unique ordering session for a table
    const sessionId = generateToken(); // Unique session ID
    const sessionStartTime = new Date().toISOString();
    
    // Store session info (optional - can be stored in database if needed)
    console.log(`[TABLE_SESSION] Created session ${sessionId} for Table ${tableId} at ${sessionStartTime}`);

    // Build table title
    const tableTitle = !tableError ? `Table ${tableId}` : 'Menu';
    const tableStatus = !tableError ? tableData?.status || 'Available' : '';
    const statusLine = !tableError ? `<p style="color: #666; font-size: 0.9em;">Status: ${tableStatus}</p>` : '';

    // Render table menu page with session context
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tableTitle} - Zawai Hotel</title>
    <link rel="stylesheet" href="/css/styles.css">
    <style>
        .table-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .table-header h1 {
            margin: 0;
            font-size: 2em;
        }
        .table-info {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            text-align: center;
        }
        .menu-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .qr-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2em;
            color: #666;
        }
        .session-badge {
            display: inline-block;
            background: #e7f3ff;
            color: #0066cc;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.85em;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="table-header">
        <h1>🍽️ Table ${tableId}</h1>
        <p>Welcome to Zawai Hotel</p>
    </div>
    
    <div class="table-info">
        <p>Scan your order or call staff for assistance</p>
        ${statusLine}
        <div class="session-badge">
            Session Active ✓
        </div>
    </div>

    <div class="menu-container">
        <div class="loading">
            <p>📋 Loading menu...</p>
            <p style="font-size: 0.9em; color: #999;">This page will be populated with your menu and ordering interface</p>
        </div>

        <div class="qr-container">
            <p style="color: #666;">Table ID: <strong>${tableId}</strong></p>
            <p style="color: #999; font-size: 0.9em;">URL: ${appUrl}/tables/${tableId}</p>
        </div>

        <script src="/js/app.js"></script>
        <script>
            // ============================================================
            // TABLE SESSION INITIALIZATION
            // ============================================================
            
            // Session data for this table ordering session
            const sessionId = '${sessionId}';
            const tableId = ${parsedTableId};
            const sessionStartTime = '${sessionStartTime}';
            
            // Initialize global state with table context
            if (window.S) {
                S.currentTableId = tableId;
                S.isTableMode = true;
                S.sessionId = sessionId;
                S.sessionStartTime = sessionStartTime;
                console.log('✓ Table mode initialized for Table', tableId);
                console.log('✓ Session ID:', sessionId);
            }
            
            // Store session in localStorage for persistence across page reloads
            localStorage.setItem('tableSession', JSON.stringify({
                tableId: tableId,
                sessionId: sessionId,
                startTime: sessionStartTime
            }));
            
            console.log('[SESSION] Created session for Table', tableId, '- ID:', sessionId);
            
            // ============================================================
            // ORDER MANAGEMENT
            // ============================================================
            
            // Function to place an order under this session
            async function placeOrder(orderItems) {
              try {
                const response = await fetch('/api/orders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tableId: tableId,
                    sessionId: sessionId,
                    items: orderItems,
                    status: 'pending'
                  })
                });
                
                const order = await response.json();
                
                if (order.id) {
                  console.log('[ORDER] Order #' + order.id + ' placed for Table', tableId);
                  console.log('[KITCHEN] Kitchen dashboard updated');
                  return order;
                }
              } catch (error) {
                console.error('[ORDER_ERROR]', error);
              }
            }
            
            // Function to get order status
            async function getOrderStatus(orderId) {
              try {
                const response = await fetch('/api/orders/' + orderId);
                const order = await response.json();
                console.log('[STATUS] Order #' + orderId + ' status:', order.status);
                return order;
              } catch (error) {
                console.error('[STATUS_ERROR]', error);
              }
            }
            
            // Make functions available globally
            window.placeOrder = placeOrder;
            window.getOrderStatus = getOrderStatus;
        </script>
    </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error serving table page:', error);
    res.status(500).json({ error: 'Failed to serve table page' });
  }
});

// ============================================================
// QR CODE FLOW - ORDER ENDPOINTS
// ============================================================

// Create order for a table
app.post('/api/orders', async (req, res) => {
  const { tableId, sessionId, items, status = 'pending', specialNotes = '' } = req.body;

  if (!tableId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'tableId and items array are required' });
  }

  try {
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        table_id: parseInt(tableId, 10),
        session_id: sessionId || null,
        items: items,
        total_amount: totalAmount,
        status: status,
        special_notes: specialNotes,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    console.log(`[ORDER_CREATED] Order #${order.id} created for Table ${tableId}`);
    console.log(`[KITCHEN_NOTIFY] Kitchen dashboard updated with new order`);

    // Broadcast to kitchen dashboard via WebSocket or polling (optional)
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
app.get('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', parseInt(orderId, 10))
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders for a table
app.get('/api/tables/:tableId/orders', async (req, res) => {
  const { tableId } = req.params;

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', parseInt(tableId, 10))
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (for kitchen dashboard)
app.patch('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    // Valid statuses: pending, preparing, ready, served, paid
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(orderId, 10))
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    console.log(`[ORDER_STATUS] Order #${orderId} status changed to: ${status}`);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// QR Code Generation API
app.post('/api/qr/generate', verifyFirebaseToken, requireAdmin, async (req, res) => {
  const { tableIds = [], domain = appUrl, formats = ['png', 'svg'] } = req.body;

  if (!Array.isArray(tableIds) || tableIds.length === 0) {
    return res.status(400).json({ error: 'tableIds array is required and must not be empty' });
  }

  try {
    const QRCode = require('qrcode');
    const results = [];

    for (const tableId of tableIds) {
      if (!tableId || isNaN(tableId)) continue;

      const url = `${domain}/tables/${tableId}`;
      const qrData = {};

      // Generate PNG if requested
      if (formats.includes('png')) {
        const pngBuffer = await QRCode.toBuffer(url, {
          errorCorrectionLevel: 'Q',
          type: 'image/png',
          width: 1000,
          margin: 4,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        qrData.png = pngBuffer.toString('base64');
      }

      // Generate SVG if requested
      if (formats.includes('svg')) {
        const svgString = await QRCode.toString(url, {
          errorCorrectionLevel: 'Q',
          type: 'image/svg+xml',
          width: 100,
          margin: 4,
          color: { dark: '#000000', light: '#FFFFFF' },
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

    res.json({
      success: true,
      count: results.length,
      domain,
      results,
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR codes', details: error.message });
  }
});

// QR Code Validation API
app.post('/api/qr/validate', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Parse URL to extract table ID
    const urlMatch = url.match(/\/tables\/(\d+)/);
    if (!urlMatch) {
      return res.json({
        valid: false,
        reason: 'Invalid table URL format',
      });
    }

    const tableId = parseInt(urlMatch[1], 10);

    // Verify table exists (optional)
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .select('id')
      .eq('id', tableId)
      .single();

    res.json({
      valid: !tableError || tableError.code === 'PGRST116', // PGRST116 = no rows
      tableId,
      url,
      decodable: true,
    });
  } catch (error) {
    res.json({
      valid: false,
      reason: error.message,
    });
  }
});

// Get QR Code Configuration
app.get('/api/qr/config', (req, res) => {
  res.json({
    baseDomain: appUrl,
    resolution: 1000,
    errorCorrection: 'Q',
    quietZone: 4,
    formats: ['png', 'svg'],
    urlPattern: '/tables/{table_id}',
  });
});

// Get Table Info
app.get('/api/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;

  if (!tableId || isNaN(tableId)) {
    return res.status(400).json({ error: 'Invalid table ID' });
  }

  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', parseInt(tableId, 10))
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table info' });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at ${appUrl}`);
});
