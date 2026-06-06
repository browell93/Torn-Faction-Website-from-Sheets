# ShadowCore HQ v1.7 — Scanner Auto Enrichment Engine

This cumulative package upgrades the ShadowCore Torn scanner/backend bridge from v1.6 to v1.7.

## Adds all 17 automatic scanner/API enrichment categories

1. Member readiness snapshots
2. War readiness scores
3. Automatic check-ins
4. Assignment tracking
5. Attack result logging
6. Enemy profile enrichment
7. Enemy/faction roster snapshots
8. Recruit lead automation
9. Hospital/revive support detection
10. Armory/support context
11. Loan/trade tracking
12. Market/bazaar/travel notes
13. Training/growth snapshots
14. Onboarding progress
15. API key health data
16. Scanner health/usage stats
17. Discord trigger queue rows

## New/updated files

- ShadowCoreScanner.user.js
- ShadowCoreScannerBridge.gs
- README_v1_7.md

## Install

1. Replace your Apps Script files with this package or at least replace ShadowCoreScannerBridge.gs and ShadowCoreScanner.user.js.
2. Run setupShadowCoreHQ().
3. Run setupShadowCoreScannerBridge().
4. Redeploy the web app as a new version.
5. Update your Tampermonkey userscript with ShadowCoreScanner.user.js.
6. Open Torn, open Scanner Settings, enable v1.7 Auto Enrichment options you actually want.

Auto enrichment is OFF by default. Members must opt in locally. API keys remain local in Tampermonkey and are not sent to HQ.
