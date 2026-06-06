# ShadowCore HQ — Codex Migration Repo

This repository is a Codex-ready copy of the ShadowCore HQ Google Apps Script project.

## What this repo contains

- `src/` — Apps Script `.gs`, `.html`, and `appsscript.json` files.
- `userscripts/` — Tampermonkey and Torn PDA scanner userscripts.
- `docs/` — prior release notes and migration notes.
- `CODEX_TASKS.md` — the first Codex task list to stabilize the project.
- `.clasp.json.template` — template for linking this repo to an Apps Script project using clasp.

## Current known issue to fix first

The app has had repeated auth/session regressions from manual patching:

- Leader token login can work.
- API-key login can fail or fall back to admin session.
- Navigation can lose session state.
- Member data can fail to render even after login.

The first Codex task should be to refactor authentication/session handling into one clean path.

## Recommended development flow

1. Create a new private GitHub repo, for example `shadowcore-hq`.
2. Upload this repository contents.
3. Open Codex and connect it to that GitHub repo.
4. Ask Codex to run the task in `CODEX_TASKS.md`.
5. Let Codex create a PR.
6. Review the diff before deploying to Apps Script.

## Apps Script deployment with clasp

Install clasp locally if you want GitHub-to-Apps-Script deploys:

```bash
npm install -g @google/clasp
clasp login
```

Then create `.clasp.json` from `.clasp.json.template` and fill in your script ID.

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "src"
}
```

Push code to Apps Script:

```bash
clasp push
```

Then redeploy your Apps Script web app from the Apps Script UI.

## Safety notes

- Do not commit Torn API keys, scanner tokens, admin tokens, or Discord webhooks.
- Keep all secrets in Apps Script Properties or the Settings sheet only if intentionally non-secret.
- Do not store member API keys in browser localStorage.
- Scanner API keys should remain local to Tampermonkey/PDA unless the user explicitly opts into server-side member sync.
