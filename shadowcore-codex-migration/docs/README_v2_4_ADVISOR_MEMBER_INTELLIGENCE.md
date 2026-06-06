# ShadowCore HQ v2.4 — Advisor / Member Intelligence Center

Adds all 15 member-information features:

1. Personal “What should I do now?” panel
2. Member education / informed score
3. Smart member explanations
4. War readiness coaching
5. Training advisor
6. War role assignment
7. Personalized knowledge base recommendations
8. Data confidence labels
9. Member timeline
10. Faction-wide “What We Need” board
11. Alert explanations
12. Better member-facing visuals
13. “Why am I seeing this?” explanation panels
14. Weekly member report
15. Officer coaching queue

## Files to update/add

Replace/update:
- Config.gs
- WebApi.gs
- Index.html
- Client.html
- Styles.html

Add:
- V24Features.gs

## Setup

Because this project has many tabs and can time out, use the mini setup:

1. Run `setupShadowCoreV24AdvisorMiniStatus()`.
2. Run `setupShadowCoreV24AdvisorMiniNext()` repeatedly until complete.
3. Redeploy the web app as a new version.
4. Open `/exec?page=advisor`.
5. Leader/officer clicks **Generate Advisor Intelligence**.
6. Optionally click **Generate Weekly Reports**.

## Pages

- `?page=advisor`
- `?page=myadvisor`
- `?page=membereducation`
- `?page=weeklyreport`
- `?page=coachingqueue`
- `?page=factionneeds`

## Notes

Advisor data is only as good as the underlying data. Scanner/API readiness snapshots, Availability Calendar, onboarding, payouts, support requests, training tracker, awards, and war attack logs all improve the recommendations.
