# ShadowCore HQ PDA Scanner v2.1.0

This is the PDA-compliant version of the ShadowCore HQ scanner.

## Why this version exists

The normal ShadowCore Scanner is built for Tampermonkey and uses Tampermonkey-only APIs such as GM_setValue / GM_getValue / GM_xmlhttpRequest. Torn PDA supports userscripts, but its GM compatibility is not identical to Tampermonkey, so this build is lighter and PDA-first.

This PDA build:

- Uses `localStorage` for settings.
- Uses `PDA_httpPost()` and `PDA_httpGet()` when available.
- Supports PDA API key injection with `###PDA-APIKEY###`.
- Avoids GM_* requirements.
- Uses a mobile-friendly floating panel.
- Keeps manual submit as the default.
- Keeps API snapshots opt-in.
- Caps API usage at 1 request per second.

## Install in Torn PDA

1. Open Torn PDA.
2. Go to Advanced Browser Settings.
3. Go to Manage Scripts.
4. Add/import `ShadowCorePDA.Scanner.user.js`.
5. Set injection time to **END** / document end.
6. Open Torn in PDA.
7. Tap the floating **🕶 HQ** button.
8. Open Settings.
9. Enter:
   - HQ Backend URL
   - Scanner Shared Token
   - Your Torn ID
   - Your Torn name
10. Tap **Save + Test HQ**.

## Backend URL

Use your ShadowCore HQ `/exec` URL:

```text
https://script.google.com/macros/s/AKfycbz40HM-fe5dbjZNYpcYBSep2i5iHNuwyqERTc2veqVuXC78mYOH9c8H5kTmUgkX8Cc5/exec
```

## Scanner Shared Token

Find it in the `Scanner_Settings` tab:

```text
Scanner_Shared_Token
```

Do not post the token publicly.

## API support

The PDA script can use the Torn PDA-injected API key. PDA replaces the placeholder:

```js
const PDA_API_KEY = '###PDA-APIKEY###';
```

at runtime when available.

You can also paste an API key manually in settings. The key stays local in PDA localStorage and is not sent to ShadowCore HQ. Only optional API snapshots are sent if the user sends them.

## Supported actions

- Scan visible page
- Send scan to HQ
- Refresh HQ context
- Add profile note
- Submit recruit lead
- Request support
- War check-in
- Log attack result
- Pull API Me snapshot
- Pull visible player API snapshots
- Send API snapshot
- Show HQ target/intel badges beside visible player links

## Notes

If the scanner says `HTTP 403`, redeploy the Google Apps Script web app with:

```text
Execute as: Me
Who has access: Anyone
```

Use the `/exec` URL, not `/dev`.

