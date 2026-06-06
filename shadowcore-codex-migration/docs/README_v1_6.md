# ShadowCore HQ v1.6 — Polish, Setup, Security, Diagnostics

This package upgrades ShadowCore HQ to v1.6 and keeps the independent Torn Scanner bundled.

## Added in v1.6

1. Setup wizard
2. Member/officer token login system
3. Privacy/API disclosure page and consent log
4. Better public recruitment microsite support
5. Anthracite/coal UI polish layer
6. Version/update/migration log
7. Backup copy system
8. Diagnostics page
9. Improved Tampermonkey scanner UI/register flow
10. Scanner install page
11. Scanner-focused onboarding steps
12. Command-style Discord message/report templates
13. Sheet protection helper
14. Safe mode
15. Admin manual

## Files added/changed

- `V16Features.gs` — v1.6 backend functions
- `Config.gs` — version and new sheet constants
- `Sheets.gs` — new tabs, menu items, settings, seed calls
- `WebApi.gs` — exposes v1.6 state
- `Index.html` — new nav/pages and member token login input
- `Client.html` — new UI pages/actions
- `Styles.html` — v1.6 polish styles
- `Code.gs` — scanner/v1.6 JSON post routing
- `ShadowCoreScanner.user.js` — scanner v1.6 UI/register polish
- `ShadowCoreScannerBridge.gs` — scanner bridge v1.6 safe-mode support
- `appsscript.json` — adds Drive scopes needed for backup copies

## Upgrade steps

1. Replace your Apps Script project files with the files in this zip.
2. Save all files.
3. Make sure `V16Features.gs` exists.
4. Run `setupShadowCoreHQ()`.
5. If using the scanner, run `setupShadowCoreScannerBridge()`.
6. Redeploy the web app as a new version.
7. Open `?page=setup` and run the setup check.
8. Open `?page=diagnostics` and run diagnostics.
9. Create a backup from `?page=backups`.
10. Review privacy text at `?page=privacy` before inviting members.

## New page routes

- `?page=setup`
- `?page=privacy`
- `?page=updates`
- `?page=backups`
- `?page=diagnostics`
- `?page=scannerinstall`
- `?page=tokens`
- `?page=commands`
- `?page=protection`
- `?page=safemode`
- `?page=manual`
- `?page=theme`

## Notes

- Backup creation uses DriveApp and requires Drive OAuth scope approval.
- Sheet protection can lock critical tabs; make sure the deploying/admin account remains an editor.
- Safe Mode pauses v1.6 write endpoint activity and the scanner bridge now refuses scanner writes while Safe Mode is on.
- The scanner still does not auto-attack, auto-buy, auto-sell, auto-trade, or auto-click Torn actions.
