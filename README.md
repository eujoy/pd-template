# pd-template

Static, read-only viewer for the [Daily Activity](https://github.com/eujoy/personal-dashboard) app.
Scan a day's QR code on the Mac and this page shows that day on the phone. The phone never talks to
the Mac, and this site never receives your data: the day travels in the URL fragment (`#v1.…`),
which browsers do not send to servers. This repository holds code only.

After one online visit the page works offline (service worker), so scanning needs no connection.

## Use

1. Publish this repository with GitHub Pages (see below).
2. Set the viewer URL in the Daily Activity app to `https://eujoy.github.io/pd-template/`.
3. Open the page once on the phone while online. Optionally add it to the Home Screen.
4. Open a day on the Mac, tap the phone button, scan the code.

Needs a browser with `DecompressionStream('deflate-raw')`: iOS Safari 16.4 or later, current Chrome.

## Publish with GitHub Pages

Repository Settings, Pages, Source "Deploy from a branch", branch `main`, folder `/ (root)`.
`.nojekyll` is already in place. There is no build step.

## Develop

```
npm test                  # unit tests, Node 22+, no dependencies
node test/e2e.mjs [dir]   # browser check with the preinstalled Playwright; optional screenshots into dir
npm run serve             # http://localhost:8080 (service workers work on localhost)
```

Try a day by hand: `http://localhost:8080/#` plus the contents of a `test/fixtures/*.fragment.txt` file.

| Path | What |
|---|---|
| `index.html`, `css/`, `js/` | The viewer. `codec.js` decodes the fragment, `model.js` validates it, `markdown.js` tokenizes item text, `view.js` builds the DOM with `createElement` only. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline shell and Home Screen install. Bump `CACHE` in `sw.js` when the precache list changes. |
| `vendor/` | Fira fonts (OFL 1.1) and Font Awesome Free 6.5.2 (icons CC BY 4.0, fonts OFL 1.1), copied unmodified from the main app. |
| `docs/PAYLOAD.md` | The payload format shared with the Go encoder. |
| `test/` | Unit tests, shared fixtures, browser check. |

## Privacy and security

- The page has a Content-Security-Policy with `connect-src 'none'`: it cannot make network requests for data.
- Payload text is only ever inserted as text nodes; links are limited to `http` and `https`.
- The scanned URL stays in the phone's browser history. Anyone with the unlocked phone can read it.
