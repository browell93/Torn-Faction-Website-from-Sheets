# ShadowCore HQ v2.6.3 — Admin Token Permissions Fix

Fixes a bug where logging in with the Admin_Token could still be blocked by v2.5 page permissions or hidden-page preferences.

## Update files
Replace these files in Apps Script:
- `Client.html`
- `V25Features.gs`

## Then run
Run this once from Apps Script:

```javascript
repairV25AdminBypassPermissions()
```

Then redeploy a new web app version.

## What it fixes
- Admin-token / Leader sessions bypass frontend page restrictions.
- Leaders cannot be locked out of `permissions`, `layout`, `settings`, `admin`, `diagnostics`, `setup`, `safemode`, `backups`, `updates`, `tokens`, `protection`, `manual`, or `theme`.
- The permissions page now treats Admin_Token login as leader access.
- Hidden page preferences no longer hide critical admin pages from leaders.
