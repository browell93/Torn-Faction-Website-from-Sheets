# ShadowCore HQ v2.5 - User Layout + Permissions

Adds all 4 requested personalization/access features:

1. Personal hide/show preferences
2. Role-based access control / page visibility
3. Collapsible dashboard/page sections
4. Custom homepage layout and presets

## Files changed/added

Update/replace:
- Config.gs
- Sheets.gs
- WebApi.gs
- Index.html
- Client.html
- Styles.html

Add:
- V25Features.gs
- SettingsCompat.gs if you have not already added it from v2.4.1

## Setup

Run:

```javascript
setupShadowCoreV25LayoutPermissions()
```

Then redeploy:

Deploy → Manage deployments → Edit → Version → New version → Deploy

## New pages

- `?page=layout` — each member/officer/leader can hide pages from their own menu, choose a default page, apply presets, and collapse sections.
- `?page=permissions` — leader-only role permissions page.

## Notes

- Personal hidden pages only affect the user's menu/layout.
- Role permissions control which roles can see/access pages in the website UI.
- Backend data is still protected by Apps Script session role checks where existing functions require officer/leader access.
- The package does not delete or rename any existing tabs.
