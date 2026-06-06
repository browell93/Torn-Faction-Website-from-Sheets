ShadowCore HQ v1.8.3 Scanner Micro Setup Timeout Fix

This fixes scanner setup timeouts by creating/repairing only one scanner sheet per run.

Update this file in Apps Script:
- ShadowCoreScannerBridge.gs

Recommended run order:
1. Run setupShadowCoreScannerBridgeMiniStatus() to see missing scanner sheets.
2. Run setupShadowCoreScannerBridgeMiniNext() repeatedly until complete=true.
3. If MiniNext still times out, run the numbered functions one at a time:
   setupShadowCoreScannerBridgeSheet01() through setupShadowCoreScannerBridgeSheet36()
   You only need to run until setupShadowCoreScannerBridgeMiniStatus() shows missing_count: 0.
4. Then continue with:
   setupShadowCoreV18DeepScanner()
   generateV18VisualSnapshot()
   generateV18SmartRecommendations()

Notes:
- The old setupShadowCoreScannerBridge() now only runs one MiniNext step.
- Formatting is skipped during setup to avoid timeout.
- Existing tabs are not renamed or deleted.
