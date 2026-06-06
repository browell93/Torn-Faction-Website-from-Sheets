# Prompt to paste into Codex

We need to stabilize this Google Apps Script project before adding features. Start with `CODEX_TASKS.md`.

Please inspect the repo, identify duplicate/obsolete auth/session functions, and refactor authentication/page navigation into one reliable flow.

Do not add new features. Fix the login/session system only.

Main bug: admin token login works, but API-key login can fail or revert to admin session, and page navigation can lose session.

Keep Apps Script compatibility. Avoid browser API key storage. Add an `authdebug` page for diagnosis.

Create a PR with a clear summary and deployment notes.
