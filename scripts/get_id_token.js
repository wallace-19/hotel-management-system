// Usage: node scripts/get_id_token.js [uid]
// Requires .env with FIREBASE_* vars and FIREBASE_WEB_API_KEY
const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function main() {
  const uid = process.argv[2] || 'test-user';
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    console.error('Set FIREBASE_WEB_API_KEY in .env (Firebase project web API key)');
    process.exit(1);
  }

  try {
    const customToken = await admin.auth().createCustomToken(uid);
    // Exchange custom token for ID token via REST API
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
    const resp = await axios.post(url, { token: customToken, returnSecureToken: true });
    console.log(resp.data.idToken);
  } catch (e) {
    console.error('Failed to mint/exchange token:', e.message || e);
    process.exit(1);
  }
}

main();
