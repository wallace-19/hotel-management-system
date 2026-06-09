// ═══════════════════════════════════════
// FIREBASE AUTH INTEGRATION
// ═══════════════════════════════════════

let firebaseAuthInstance = null;

function initFirebaseAuth() {
  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    console.warn('Firebase config is not set in js/firebase-config.js');
    return;
  }

  if (!window.firebase || !window.firebase.auth) {
    console.warn('Firebase SDK is not loaded');
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }

  firebaseAuthInstance = firebase.auth();
  firebaseAuthInstance.onAuthStateChanged(async user => {
    if (user) {
      const token = await user.getIdToken();
      S.user = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email
      };
      S.isAuthenticated = true;
      S.authToken = token;
      if (S.view === 'auth-login') {
        navigate('landing');
        return;
      }
    } else {
      S.user = null;
      S.isAuthenticated = false;
      S.authToken = null;
      if (S.view !== 'auth-login') {
        navigate('auth-login');
        return;
      }
    }
    render();
  });
}

async function signInUser(email, password) {
  if (!firebaseAuthInstance) return toast('Auth not initialized', '⚠');
  try {
    await firebaseAuthInstance.signInWithEmailAndPassword(email, password);
    toast('Signed in successfully', '✓');
    navigate('table-select');
  } catch (error) {
    toast(error.message || 'Sign-in failed', '⚠');
  }
}

async function signUpUser(email, password, fullName) {
  if (!firebaseAuthInstance) return toast('Auth not initialized', '⚠');
  try {
    const result = await firebaseAuthInstance.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: fullName });
    toast('Account created. Signed in!', '✓');
    navigate('table-select');
  } catch (error) {
    toast(error.message || 'Sign-up failed', '⚠');
  }
}

async function signOutUser() {
  if (!firebaseAuthInstance) return toast('Auth not initialized', '⚠');
  try {
    await firebaseAuthInstance.signOut();
    toast('Signed out', '✓');
    navigate('auth-login');
  } catch (error) {
    toast(error.message || 'Sign-out failed', '⚠');
  }
}

function switchAuthMode(mode) {
  S.authMode = mode;
  render();
}

async function submitAuthForm(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value.trim();
  const fullName = document.getElementById('auth-fullname')?.value.trim();

  if (!email || !password) {
    toast('Email and password are required', '⚠');
    return;
  }

  if (S.authMode === 'signup') {
    if (!fullName) {
      toast('Please enter your name', '⚠');
      return;
    }
    await signUpUser(email, password, fullName);
  } else {
    await signInUser(email, password);
  }
}

async function getIdToken() {
  if (!firebaseAuthInstance) return null;
  const user = firebaseAuthInstance.currentUser;
  return user ? await user.getIdToken() : null;
}

async function forgotPassword() {
  if (!firebaseAuthInstance) return toast('Auth not initialized', '⚠');
  const email = document.getElementById('auth-email')?.value.trim();
  if (!email) {
    toast('Please enter your email address', '⚠');
    return;
  }
  try {
    await firebaseAuthInstance.sendPasswordResetEmail(email);
    toast('Password reset email sent. Check your inbox.', '✓');
  } catch (error) {
    toast(error.message || 'Failed to send reset email', '⚠');
  }
}

async function apiFetch(path, options = {}) {
  const token = await getIdToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, Object.assign({}, options, { headers }));
  return response.json();
}

window.initFirebaseAuth = initFirebaseAuth;
window.signInUser = signInUser;
window.signUpUser = signUpUser;
window.signOutUser = signOutUser;
window.switchAuthMode = switchAuthMode;
window.submitAuthForm = submitAuthForm;
window.apiFetch = apiFetch;
window.forgotPassword = forgotPassword;
