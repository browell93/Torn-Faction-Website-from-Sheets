# ShadowCore HQ v1.8.1 Timeout Fix

This patch fixes setup timeouts by splitting the heavy v1.8 install into smaller runs.

Run in this order from Apps Script:

1. setupShadowCoreHQ()
2. setupShadowCoreScannerBridge()
3. setupShadowCoreV18DeepScanner()
4. generateV18VisualSnapshot()
5. generateV18SmartRecommendations()
6. Optional: reorganizeShadowCoreSheetsV18()

Do not run tab reorganization until after the core/scanner/v1.8 sheets are created.
