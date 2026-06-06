# ShadowCore HQ v2.2 — Field, Visuals, Availability, Chain Planner Fix

This update fixes the issues where Energy/Life/Nerve/Happy/cooldowns/hospital until did not show, makes Updated/time fields display in the user's local 12-hour time in the browser, repairs Graphs/Visuals fallback rendering, improves Availability Calendar timezone handling, and upgrades Chain Bonus Planner to use Availability Calendar timezones/windows.

## Update these files
- Config.gs
- Sheets.gs
- WebApi.gs
- V12Features.gs
- V13Features.gs
- V18Features.gs
- ShadowCoreScannerBridge.gs
- Client.html
- V22Features.gs (new)

## Setup
1. Replace the files above in Apps Script.
2. Save.
3. Run: setupShadowCoreV22Fixes()
4. Run: setupShadowCoreHQ()
5. Redeploy the web app as a new version.
6. Update scanner bridge only if you use scanner/API readiness submissions.

## Notes
- Member_Status bar/cooldown fields populate from member opt-in scanner/API readiness snapshots. They cannot be pulled for every member from a faction key alone.
- The scanner/API key is still local to the member; only snapshot data is submitted when they opt in.
- Availability Calendar now defaults Torn ID/name from the logged-in API/member session and provides a timezone dropdown.
- Chain Bonus Planner now scores recommended start windows in TCT/UTC using availability windows and member timezones.
