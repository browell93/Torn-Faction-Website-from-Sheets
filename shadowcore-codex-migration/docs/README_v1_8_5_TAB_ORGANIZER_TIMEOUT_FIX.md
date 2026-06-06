# ShadowCore HQ v1.8.5 Tab Organizer Timeout Fix

This patch makes `reorganizeShadowCoreSheetsV18()` timeout-safe.

## Update
Replace `V18Features.gs`.

## Use
Do not run the old heavy organizer expecting it to finish in one pass. In v1.8.5 it only does one step.

Run:

```javascript
reorganizeShadowCoreSheetsV18Reset()
```

Then run repeatedly:

```javascript
reorganizeShadowCoreSheetsV18MiniNext()
```

until `complete: true`.

Check progress anytime:

```javascript
reorganizeShadowCoreSheetsV18MiniStatus()
```

After complete, optionally rebuild the organizer log:

```javascript
buildV18TabOrganizationLog()
```

The organizer is optional. If it continues to time out, skip it; it only improves sheet tab order/coloring and does not affect the website/scanner core functions.
