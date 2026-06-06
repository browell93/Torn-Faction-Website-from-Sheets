# Codex Task: Stabilize ShadowCore HQ Authentication and Page Loading

## Goal

Refactor ShadowCore HQ so login/session/page loading works reliably before adding more features.

## Current symptoms

1. Leader/admin token login can work.
2. API-key login may fail, return null, or revert to the old admin session.
3. Switching pages can lose session or show `Login required` even after login.
4. Member pages may know Torn ID/name but fail to load member data.
5. Several old auth functions may coexist across patches and conflict.

## Hard requirements

### Auth modes

Implement exactly three login types:

- `ADMIN_TOKEN` — admin/leader token from Settings sheet.
- `MEMBER_TOKEN` — optional member/officer token if present.
- `TORN_API_KEY` — member login via Torn API key.

### Session rules

- A successful login must create exactly one active browser session.
- Switching login type must clear the previous session first.
- API login must never fall back to admin session.
- Admin login must never overwrite API/member identity unless the user logs in as admin.
- Page navigation must preserve the active session.
- Session validation must be a single backend function used by all private pages.

### API-key login

- Verify the key against Torn API using a tolerant v2/v1 fallback.
- Extract Torn ID and name from the response.
- If the key verifies but bars/cooldowns selections are missing, login should still succeed and display a warning.
- Store member API keys server-side only if the user consents to auto-sync.
- Never store API keys in browser storage.

### Member data display

- My Faction Life must show at minimum:
  - Torn ID
  - Name
  - Role/source
  - Session type
  - Last login time
- Then load optional data from sheets by Torn ID.
- Empty module rows should show `No data yet`, not break the page.

### Page loading

- Direct URLs like `?page=war`, `?page=mylife`, `?page=knowledge` must render that page.
- Clicking sidebar tabs must update page state without losing session.
- Dashboard should not always override the requested page.
- Private denied pages should show a clear message, not redirect silently.

### Debugging

Add an admin-only `?page=authdebug` page that displays:

- current browser session ID
- backend validated session
- role
- auth source
- Torn ID/name
- permission result for current page
- last auth error

## Code cleanup

- Remove or ignore obsolete auth entry points where possible.
- Keep one authoritative auth module in `Security.gs` or a new `Auth.gs`.
- Keep one client auth state object in `Client.html`.
- Do not patch by adding more competing functions.

## Testing checklist

1. Clear browser storage.
2. Login with admin token.
3. Navigate to `admin`, `permissions`, `knowledge`, `war`, `mylife`.
4. Logout.
5. Login with Torn API key.
6. Verify the top badge says member/API identity, not admin.
7. Navigate to `mylife`, `knowledge`, `payouts`, `gymgains`.
8. Refresh page and confirm session persists.
9. Switch from API login to admin login and confirm identity changes.
10. Switch from admin login to API login and confirm it does not revert.
