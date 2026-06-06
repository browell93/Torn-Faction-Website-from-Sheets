# ShadowCore HQ Torn Scanner v1.5

Independent Tampermonkey scanner/overlay for Torn that supports the ShadowCore HQ Google Apps Script website.

## What changed in v1.5

Adds optional **local Torn API usage** inside the Tampermonkey scanner.

- User can paste their Torn API key into the scanner settings.
- The key is stored only in Tampermonkey local storage in that browser.
- The key is not sent to ShadowCore HQ.
- API polling can be enabled or disabled by the user.
- API rate is configurable from 0.05 requests/second up to **1 request/second maximum**.
- Manual buttons were added for:
  - API Me
  - API Visible
  - Send API Snapshot
  - Start/Stop API Poll
- API snapshots can be submitted to ShadowCore HQ only if the user enables that setting and clicks Send API Snapshot.
- New backend sheet: `API_Snapshots`.

## Files

- `ShadowCoreScanner.user.js` — Tampermonkey userscript.
- `ShadowCoreScannerBridge.gs` — Apps Script bridge file.
- `CodeGs_doPost_patch.txt` — patch for your existing `Code.gs` `doPost(e)` handler.
- `README.md` — this file.

## Backend install / upgrade

1. Open your ShadowCore HQ Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Add or replace the file named:

```text
ShadowCoreScannerBridge.gs
```

4. Make sure your `Code.gs` `doPost(e)` includes the patch from `CodeGs_doPost_patch.txt`.
5. Save.
6. Run:

```javascript
setupShadowCoreScannerBridge()
```

7. Redeploy your Apps Script web app as a new version.

## Tampermonkey install / upgrade

1. Open Tampermonkey.
2. Open your ShadowCore scanner script.
3. Replace it with `ShadowCoreScanner.user.js`.
4. Save.
5. Open Torn.
6. Open the ShadowCore Scanner settings.
7. Set:
   - HQ Backend URL
   - Scanner Shared Token
   - Your Torn ID
   - Your Torn Name
8. Optional API setup:
   - Enable local Torn API pulls.
   - Paste your Torn API key.
   - Set API rate up to 1 request/second.
   - Pick API selections.
   - Keep snapshot submission disabled unless you intentionally want to send API results to HQ.

## API rate setting

The scanner enforces a minimum delay between Torn API calls. The fastest setting is:

```text
1 request / second
```

Examples:

```text
1.00/s = 1 call every 1 second
0.50/s = 1 call every 2 seconds
0.20/s = 1 call every 5 seconds
0.10/s = 1 call every 10 seconds
```

## Recommended API selections

For your own member panel:

```text
profile,bars,cooldowns,travel,icons
```

For visible players:

```text
profile
```

Keep visible-player API limit low. Suggested:

```text
5 visible players per button press
```

## Safety notes

- The scanner does not auto-attack.
- The scanner does not auto-buy, auto-sell, auto-trade, or auto-click Torn actions.
- The scanner does not collect passwords.
- The scanner does not send the user's API key to ShadowCore HQ.
- API snapshot sharing is opt-in.
- Auto-polling is off by default.

