# TODO - Resolve 401/403 error (backend)

- [ ] Inspect current auth/role logic in `server.js` (syncUserToSupabase + requireAdmin)
- [ ] Update `syncUserToSupabase` to preserve existing `role` and set role from token/custom claims when creating a user
- [ ] Improve `requireAdmin` error payload (include current role) to speed debugging
- [ ] Smoke test: run `node server.js` and check key endpoints with/without valid tokens

