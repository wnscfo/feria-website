# feria — teaser site

Marketing teaser / waitlist landing page for **feria** — a double-entry ledger built for
autonomous agents.

Ported from the `Feria Teaser Drift FINAL` Claude Design prototype into a plain, dependency-free
static site. The prototype's `.dc` runtime is only a preview harness; the page itself needs no
framework.

## Files

| File         | Purpose                                                              |
| ------------ | ------------------------------------------------------------------- |
| `index.html` | Page markup (stage, drift columns mount point, wordmark, waitlist). |
| `styles.css` | All styling, keyframes, and the vignette-masked drift layout.       |
| `feria.js`   | Builds the three drifting ledger columns; handles the email join.   |

## Run locally

It's fully static — open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes

- The three background columns drift upward at slightly different speeds (base `SPEED = 46s`
  in `feria.js`); rows are repeated so the loop is seamless.
- The email field is front-end only — pressing **Enter** swaps to a confirmation state. Wire it
  to a real waitlist endpoint in `feria.js` (`join()`) before launch.
- Motion is disabled under `prefers-reduced-motion`.
