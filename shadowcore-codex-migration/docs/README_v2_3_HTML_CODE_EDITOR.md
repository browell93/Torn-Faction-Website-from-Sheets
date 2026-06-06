# ShadowCore HQ v2.3 - Torn HTML Code Copier / Editor

This patch changes the old BBCode Center into a Torn HTML Code Copier / Editor.

## What it adds

- HTML snippet generator
- HTML code editor textarea
- Live preview iframe
- Copy HTML button
- Copy plain text button
- Save edited HTML snippets
- HTML snippet history sheet
- Legacy BBCode snippets kept as archive only
- Backwards-compatible page id: `?page=bbcode`
- Optional alias: `?page=htmlcode` redirects in the UI to the HTML editor

## Files to update

Replace/update these files in Apps Script:

- `Config.gs`
- `Sheets.gs`
- `WebApi.gs`
- `Index.html`
- `Client.html`
- `Styles.html`
- `V12Features.gs`
- `V18Features.gs`

Add this new file:

- `V23Features.gs`

## Setup

Run this once:

```javascript
setupShadowCoreV23HtmlEditor()
```

This creates the `HTML_Snippets` sheet and seeds basic editor settings.

You can also run your normal setup later, but if your Sheet is timing out, run only the v2.3 setup above.

## Page URL

Use the same old page link; it now opens the HTML editor:

```text
/exec?page=bbcode
```

You can also use:

```text
/exec?page=htmlcode
```

## Notes

The sanitizer removes scripts, event-handler attributes, javascript: links, iframe/object/embed/form/input blocks, and other high-risk code before saving generated/edited snippets. Always preview before posting to Torn.
