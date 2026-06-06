# ShadowCore HQ v2.5.1 - Layout Permissions Timeout Fix

This patch fixes Spreadsheet service timeouts during `setupShadowCoreV25LayoutPermissions()`.

## Update
Replace only:

- `V25Features.gs`

## Setup
Run:

```javascript
setupShadowCoreV25LayoutPermissionsMiniStatus()
```

Then repeatedly run:

```javascript
setupShadowCoreV25LayoutPermissionsMiniNext()
```

until it returns `complete: true`.

The normal function `setupShadowCoreV25LayoutPermissions()` now runs only one small setup step, so it is safe to run repeatedly too.

## If a step still times out
Run one sheet at a time:

```javascript
setupShadowCoreV25LayoutPermissionsSheet01()
setupShadowCoreV25LayoutPermissionsSheet02()
setupShadowCoreV25LayoutPermissionsSheet03()
setupShadowCoreV25LayoutPermissionsSheet04()
setupShadowCoreV25LayoutPermissionsSheet05()
```

Then use MiniNext for permissions/presets.

This setup intentionally skips heavy formatting, freezing, and sheet clearing.
