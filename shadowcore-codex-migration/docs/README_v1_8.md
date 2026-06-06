# ShadowCore HQ v1.8 - Deep Scanner, Opt-In Data, Graphs, and Tab Reorganization

This package is cumulative with the earlier ShadowCore HQ + scanner releases. It adds the requested 17 extra scanner/API categories, visual dashboards, smart recommendation rows, opt-in tracking, and Google Sheet tab organization.

## New v1.8 scanner/API categories

1. Armory stock and armory-news tracking
2. Faction respect and upgrade progress
3. Organized crime result history
4. Member bazaar/business snapshots
5. Property / vault / rental / training setup notes
6. Education / course tracking
7. Merit / awards progress
8. Mission tracking
9. Race / racing progress
10. Casino / bankroll tracker
11. Item quality / weapon / armor stat scanner
12. Reviver / healer performance
13. Booster/drug/medical cooldown forecasting
14. Event / news scanner
15. Member risk flags
16. Faction competition tracker
17. Smart recommendations layer

Sensitive categories remain opt-in. The scanner still does not send the Torn API key to ShadowCore HQ.

## New Apps Script file

Add this file:

- `V18Features.gs`

## Important updated files

Replace these from the package:

- `Config.gs`
- `Sheets.gs`
- `WebApi.gs`
- `Index.html`
- `Client.html`
- `Styles.html`
- `ShadowCoreScanner.user.js`
- `ShadowCoreScannerBridge.gs`
- `V18Features.gs`

## New pages

Use your `/exec` URL with:

- `?page=scannerdeep`
- `?page=visuals`
- `?page=scanneroptin`
- `?page=recommendations`
- `?page=taborganizer`

## New setup functions

Run:

```javascript
setupShadowCoreHQ()
```

This now also attempts to create/repair the scanner bridge and v1.8 sheets.

You can also run directly:

```javascript
setupShadowCoreV18DeepScanner()
reorganizeShadowCoreSheetsV18()
generateV18VisualSnapshot()
generateV18SmartRecommendations()
```

## New sheets

- `Armory_Stock`
- `Armory_News`
- `Faction_Respect_Upgrades`
- `OC_Result_History`
- `Member_Business_Snapshots`
- `Property_Training_Notes`
- `Education_Tracking`
- `Merit_Award_Progress`
- `Mission_Tracking`
- `Racing_Progress`
- `Casino_Bankroll`
- `Gear_Item_Scans`
- `Reviver_Performance`
- `Cooldown_Forecasts`
- `Event_News_Scans`
- `Member_Risk_Flags`
- `Smart_Recommendations`
- `Scanner_Opt_In_Preferences`
- `Visual_Snapshots`
- `Tab_Organization`

## Tab organization

v1.8 does not rename existing tabs. Renaming would break older code. Instead it:

- creates missing v1.8 tabs
- reorders tabs into sections
- colors tabs by section
- optionally creates section-marker tabs
- logs the layout in `Tab_Organization`

## Scanner update

Install the updated `ShadowCoreScanner.user.js` in Tampermonkey. Open Torn, go to scanner settings, and enable:

- v1.7/v1.8 auto enrichment
- v1.8 deep scanner categories
- any sensitive categories you personally opt into

