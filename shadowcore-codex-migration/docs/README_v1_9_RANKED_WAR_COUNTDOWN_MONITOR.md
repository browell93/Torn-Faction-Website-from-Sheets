# ShadowCore HQ v1.9 — Ranked War Countdown Enemy Readiness Monitor

Adds a 105-hour ranked-war countdown monitor for scouting a selected Torn faction before war starts.

## What it adds

- Pull selected faction member list
- Poll member status and last action at safe intervals
- Store timestamped snapshots in Google Sheets
- Track online/offline/idle patterns across the countdown
- Detect okay, travel, abroad, hospital, and jail states
- Estimate activity windows by Torn time / TCT
- Identify most active and least active members
- Identify best target windows
- Landing Watcher for members returning from travel
- Generate final pre-war readiness report
- Visual pages/components:
  - `MemberActivityTable`
  - `ActivityHeatmap`
  - `WarReadinessReportView`

## New pages

- `?page=warcountdown`
- `?page=MemberActivityTable`
- `?page=ActivityHeatmap`
- `?page=WarReadinessReportView`

## New sheets

- `RWC_Monitors`
- `RWC_Members`
- `RWC_Snapshots`
- `RWC_Hourly_Activity`
- `RWC_Travel_Watch`
- `RWC_Landing_Events`
- `RWC_Reports`
- `MemberActivityTable`
- `ActivityHeatmap`
- `WarReadinessReportView`

## Install

Replace/add these files from the package:

- `V19Features.gs`
- `Config.gs`
- `WebApi.gs`
- `Index.html`
- `Client.html`
- `Styles.html`
- `Sheets.gs`

Then run setup. If your spreadsheet is timeout-prone, use the mini setup:

```javascript
setupShadowCoreV19WarCountdownMonitorMiniStatus()
setupShadowCoreV19WarCountdownMonitorMiniNext()
```

Keep running `setupShadowCoreV19WarCountdownMonitorMiniNext()` until `complete: true`.

Or run the full installer once:

```javascript
setupShadowCoreV19WarCountdownMonitor()
```

## Use

1. Open `?page=warcountdown`.
2. Enter the enemy faction ID.
3. Leave countdown hours at `105`.
4. Leave poll interval at `15` minutes unless you have a reason to change it.
5. Click **Create Monitor**.
6. Click **Poll Now** once to test.
7. Click **Install 15-min Trigger** to monitor through the countdown.
8. Generate the report anytime, especially near the end of the countdown.

## Notes

- This is read-only monitoring using Torn API data available to your configured faction key.
- Default trigger interval is 15 minutes to stay conservative.
- Torn time is treated as UTC/TCT.
- Recommendations are scouting aids only; always re-check current Torn status immediately before war starts.
