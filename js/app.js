// ═══════════════════════════════════════
// APPLICATION INITIALIZATION
// ═══════════════════════════════════════

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  initializeState();
  updateTableStatus();
  await loadAppConfig();
  if (typeof initFirebaseAuth === 'function') {
    initFirebaseAuth();
  }
  bootApp();
});
