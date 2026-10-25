# Payload format, version 1

The Daily Activity app (`eujoy/personal-dashboard`) shows one QR code per day. It encodes

```
https://<this-site>/#v1.<token>
```

`<token>` is the day as compact JSON, compressed with raw deflate (RFC 1951, no zlib or gzip header)
and encoded as base64url without padding. The part after `#` is never sent to a server.

Limits the viewer enforces: 256 KiB inflated, 5,000 items, 200 sections, 6 levels of nesting,
2,000 characters of text per item. A payload outside them is shown as unreadable.

## JSON shape

```json
{
  "v": 1,
  "d": "22-10-2026",
  "t": "2026-10-22T17:42:00Z",
  "s": 0,
  "x": 0,
  "sec": [
    {
      "ic": "fa-code-branch",
      "c": "#3b82f6",
      "i": [
        { "t": "Code review on several pull requests.", "c": [ { "t": "List of pull requests:" } ] }
      ]
    }
  ]
}
```

| Key | Meaning |
|---|---|
| `v` | Format version, an integer. A viewer older than the payload shows "needs a newer viewer". |
| `d` | Date, `DD-MM-YYYY`. Required. |
| `t` | Snapshot time, RFC 3339. Optional. |
| `s` | Day status: `0` normal, `1` day off, `2` out sick, `3` public holiday. Default `0`. |
| `x` | Number of items dropped to fit the QR code. Default `0`. The viewer shows a notice when above 0. |
| `sec` | Sections, in order. Sections with no items are skipped. |
| `sec[].ic` | Font Awesome class of the section type (`fa-` plus lowercase letters, digits and dashes). Falls back to `fa-list`. |
| `sec[].c` | Section color, `#rrggbb`. Falls back to grey. |
| `sec[].i` | Items. Each is `{ "t": text, "c": [children] }`. Level is implied by nesting. |

The first item of a section is the card heading. The body lists that item's children first, then any
further top-level items.

Item text is inline markdown: `[label](https://… "ref:fa-icon")`, `` `code` ``, `**bold**`, `*italic*`.
Only `http` and `https` links are links. Everything else is shown as plain text, and nothing is ever
inserted as HTML.

## Fixtures

`test/fixtures/*.json` are the decoded payloads and `test/fixtures/*.fragment.txt` the matching
tokens, produced with a different deflate implementation (Python `zlib`) than the browser's. The Go
encoder should decode and re-encode to the same JSON so the two sides cannot drift.
