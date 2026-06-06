# ShadowCore HQ v1.8.4 - V18 Deep Scanner Micro Setup Fix

This fix prevents `setupShadowCoreV18DeepScanner()` from timing out by creating/repairing only one v1.8 sheet per run.

## File to replace
- V18Features.gs

## Run order
1. `setupShadowCoreV18DeepScannerMiniStatus()`
2. Run `setupShadowCoreV18DeepScannerMiniNext()` repeatedly until `complete: true` or `missing_count: 0`.
3. Run `setupShadowCoreV18DeepScannerSeedSettings()` after the sheets are complete.
4. Then run `generateV18VisualSnapshot()` and `generateV18SmartRecommendations()`.
5. Run `reorganizeShadowCoreSheetsV18()` last, only after everything else is working.

## If MiniNext still times out
Run individual numbered sheet functions, such as:
- `setupShadowCoreV18DeepScannerSheet01()`
- `setupShadowCoreV18DeepScannerSheet02()`
- ...through `setupShadowCoreV18DeepScannerSheet20()`

Check progress with `setupShadowCoreV18DeepScannerMiniStatus()`.

This patch also removes formatting/freezing/coloring from the v1.8 deep scanner setup path because those spreadsheet operations were causing timeouts.
