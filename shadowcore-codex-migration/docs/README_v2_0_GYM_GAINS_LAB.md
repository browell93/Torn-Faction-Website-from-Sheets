# ShadowCore HQ v2.0 — Gym Gains Lab

Adds a Vladar-formula gym gains calculator to ShadowCore HQ.

## New pages

- `?page=gymgains` — main calculator, presets, API bonus parser
- `?page=GymGainComparison` — all-gym side-by-side comparison
- `?page=GymGainProjectionView` — multi-day projection rows + chart
- `?page=GymGoalEstimatorView` — time-to-goal estimator

## New Apps Script file

- `V20Features.gs`

## Updated files

- `Config.gs`
- `WebApi.gs`
- `Index.html`
- `Client.html`
- `Sheets.gs`

## New sheets

- `Gym_Settings`
- `Gym_Calculations`
- `Gym_Sessions`
- `Gym_Projections`
- `Gym_Goal_Estimates`
- `GymGainComparison`
- `Gym_Jump_Presets`
- `Gym_API_Bonus_Snapshots`
- `Gym_Consumable_Costs`
- `GymGainProjectionView`
- `GymGoalEstimatorView`

## Setup

Because large Sheets can time out, use the mini setup first:

```javascript
setupShadowCoreV20GymGainsLabMiniStatus()
```

Then run repeatedly:

```javascript
setupShadowCoreV20GymGainsLabMiniNext()
```

until it returns `complete: true`.

If your sheet is stable, you can run:

```javascript
setupShadowCoreV20GymGainsLab()
```

## Formula

Uses the currently documented Torn Wiki / Vladar formula constants:

`Modifiers * Gym Dots * Energy Per Train * [ (a * ln(Happy + b) + c) * Stat + d * (Happy + b) + e ]`

Constants are included in `V20Features.gs`.

## Notes

- API bonus parsing is best-effort because Torn API shapes/selections vary by key.
- Member API keys are not written to the sheet; it uses existing stored-key behavior.
- Consumable costs are estimates. Edit `Gym_Settings` or preset rows to match current market values.
- Happy loss defaults to 0.50 energy-to-happy ratio, the midpoint of the wiki's 40–60% range.
