ShadowCore HQ v1.8.2 Scanner Timeout Fix

This fixes scanner bridge setup timeouts by splitting setupShadowCoreScannerBridge into four smaller batches and making scanner sheet formatting lighter.

Update these files:
- ShadowCoreScannerBridge.gs
- README_v1_8_2_SCANNER_TIMEOUT_FIX.md

Run these functions one at a time:
1. setupShadowCoreScannerBridgeBatch1
2. setupShadowCoreScannerBridgeBatch2
3. setupShadowCoreScannerBridgeBatch3
4. setupShadowCoreScannerBridgeBatch4
5. setupShadowCoreScannerBridgeAllBatchesStatus

Do not run tab organizer until every setup batch works.
