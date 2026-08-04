# feria — teaser site

Marketing teaser / waitlist landing page for **feria** — a double-entry ledger built for
autonomous agents.

A plain, dependency-free static site: one HTML file, one stylesheet, and a little vanilla JS.
No build step, no framework.

## Files

| File                    | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `index.html`            | Page markup — stage, background `<canvas>`, hero scrim, wordmark, waitlist form. |
| `styles.css`            | All styling, keyframes, and the hero scrim/vignette.                             |
| `ascii-field.js`        | Canvas renderer — a drifting energy blob that lights the API-call ledger.        |
| `ledger-data.js`        | The mock API-call stream data the ledger renders (`window.FERIA_STREAMS`).       |
| `feria.js`              | Waitlist email form (validation + submit to the backend).                        |
| `apps-script/waitlist.gs` | Google Apps Script web app that stores waitlist emails (the form's backend).    |

## Run locally

It's fully static — open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How the background works

`ascii-field.js` renders everything to a single full-viewport `<canvas>`:

- A slow-drifting **energy blob** roams the screen (a soft bloom halo tracks it).
- Three columns of **mock API-call ledger** lines drift upward (data in `ledger-data.js`) —
  transactions, agent runs, hash-chain appends, etc. At rest they're dim raw-TTY status hues;
  as the blob sweeps over a line it lights up violet→cyan with a little bloom. So the energy
  literally illuminates the ledger the agents are writing.
- Column count adapts to width (1 / 2 / 3), and the whole thing renders a single static frame
  under `prefers-reduced-motion`.

The centered wordmark, tagline, and form sit above a soft-black **hero scrim** (`.stage__veil`)
so they stay readable wherever the blob roams.

## Waitlist

The email field posts to a Google Apps Script web app. Set the deployment `/exec` URL in
`WAITLIST_ENDPOINT` at the top of `feria.js`; leaving it empty keeps the form in local-only mode
(shows success without storing). The matching server code is in `apps-script/waitlist.gs`.

## Deployment

Hosted on **Netlify**, which auto-deploys on every push to `main` (no build command — the repo
root is published as-is). The custom domain **feria.co** is managed at GoDaddy with DNS pointed
at Netlify (apex `A` → Netlify load balancer, `www` → `apex-loadbalancer.netlify.com`).

To ship: merge to `main` and Netlify publishes within a minute or two.
