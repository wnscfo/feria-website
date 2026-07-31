// feria — teaser landing page behavior.
// Ported from the "Feria Teaser Drift FINAL" design prototype:
//  - builds three drifting columns of ledger log lines
//  - handles the email waitlist input (Enter to join)

(() => {
  "use strict";

  // Dot colors for log lines, mirroring the source design.
  const OK = "oklch(0.55 0.10 170)";
  const AGENT = "oklch(0.48 0.10 300)";
  const WARN = "oklch(0.58 0.11 75)";
  const DIM = "#2c3136";

  // Base drift duration in seconds (was the prototype's `speed` prop, default 46).
  const SPEED = 46;

  // Waitlist backend: Google Apps Script web-app "/exec" URL.
  // Paste the deployment URL from apps-script/waitlist.gs here. Empty string
  // keeps the form in "local only" mode (shows success without storing).
  const WAITLIST_ENDPOINT = "https://script.google.com/macros/s/AKfycbxUM8oIrQ38LEd9mSPb8PcTAsJAKrqMvkMZ1GAhJ1v1sO8LoKsHfEN2Oh5cDaEtkue-KQ/exec";

  // Minimal email shape check, mirrored server-side.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // POST the email to the waitlist backend. Uses a form-encoded body so the
  // browser sends a "simple" request (no CORS preflight, which Apps Script
  // does not answer). Returns true on success, false on any failure.
  async function submitEmail(email) {
    if (!WAITLIST_ENDPOINT) return true; // no backend configured yet
    try {
      const body = new URLSearchParams({ email, source: "feria.co" });
      const res = await fetch(WAITLIST_ENDPOINT, { method: "POST", body });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({ ok: false }));
      return data.ok === true;
    } catch {
      return false;
    }
  }

  // Each row: [text, code, dotColor].
  const COLUMN_A = [
    ["POST /v1/transactions", "201", OK],
    ["balanced=true seq=4182", "ok", DIM],
    ["hash c7b83d…10f9", "chain", DIM],
    ["agt_reconciler_v3 run_7Kd2", "1.4s", AGENT],
    ["match stmt_l_0038 → INV-2291", "0.4%", DIM],
    ["POST /v1/transactions", "201", OK],
    ["dr 1100 12480.00", "cash", DIM],
    ["cr 4000 12000.00", "revenue", DIM],
    ["cr 2400 480.00", "deferred", DIM],
    ["GET /v1/trial_balance", "200", OK],
    ["period_2026_07 open", "d28/31", DIM],
    ["POST /v1/transactions", "422", WARN],
  ];

  const COLUMN_B = [
    ["POST /v1/bills", "201", OK],
    ["agt_ap_clerk over limit 15000.00", "queued", WARN],
    ["review_queue += 1", "human", WARN],
    ["GET /v1/accounts?type=asset", "200", OK],
    ["idempotency recon-mercury-88401", "hit", DIM],
    ["POST /v1/transactions", "409", DIM],
    ["reversal_of txn_01J9K6…", "posted", OK],
    ["webhook transaction.posted", "2xx", DIM],
    ["agt_close_bot sweep", "0.9s", AGENT],
    ["prev 9f21c0…a4e7", "chain", DIM],
    ["POST /v1/journal_entries", "201", OK],
    ["unbalanced 0 · today", "clean", OK],
  ];

  const COLUMN_C = [
    ["bank_feed mercury sync", "38 lines", DIM],
    ["POST /v1/transactions", "201", OK],
    ["cr 2000 578,400.00", "vendors", DIM],
    ["agt_invoice_bot draft", "1.1s", AGENT],
    ["GET /v1/transactions?limit=50", "200", OK],
    ["fx fee 142.80 unmatched", "flag", WARN],
    ["POST /v1/reversals", "201", OK],
    ["audit export period_2026_06", "signed", DIM],
    ["POST /v1/transactions", "201", OK],
    ["seq 4183 → 4184", "append", DIM],
    ["agt_reconciler_v3 idle", "wait", AGENT],
    ["trial balance agrees", "0.00", OK],
  ];

  // Repeat the rows so the -50% drift loop is seamless.
  const repeat = (rows) => rows.concat(rows, rows, rows);

  function makeLine([text, code, dot]) {
    const line = document.createElement("div");
    line.className = "drift__line";

    const dotEl = document.createElement("span");
    dotEl.className = "drift__dot";
    dotEl.style.background = dot;

    const textEl = document.createElement("span");
    textEl.className = "drift__text";
    textEl.textContent = text;

    const codeEl = document.createElement("span");
    codeEl.className = "drift__code";
    codeEl.textContent = code;

    line.append(dotEl, textEl, codeEl);
    return line;
  }

  function makeColumn(rows, durationSeconds) {
    const col = document.createElement("div");
    col.className = "drift__col";

    const track = document.createElement("div");
    track.className = "drift__track";
    track.style.setProperty("--dur", durationSeconds + "s");

    const frag = document.createDocumentFragment();
    for (const row of repeat(rows)) frag.appendChild(makeLine(row));
    track.appendChild(frag);

    col.appendChild(track);
    return col;
  }

  function mountDrift() {
    const drift = document.getElementById("drift");
    if (!drift) return;
    drift.append(
      makeColumn(COLUMN_A, SPEED),
      makeColumn(COLUMN_B, Math.round(SPEED * 1.32)),
      makeColumn(COLUMN_C, Math.round(SPEED * 0.82))
    );
  }

  function mountJoin() {
    const form = document.getElementById("join-form");
    const input = document.getElementById("join-email");
    const hint = document.getElementById("join-hint");
    const done = document.getElementById("join-done");
    const echo = document.getElementById("join-echo");
    if (!form || !input || !hint || !done || !echo) return;

    // Fade the "enter" hint in once there is something to submit.
    input.addEventListener("input", () => {
      hint.classList.toggle("is-ready", input.value.trim().length > 0);
    });

    let submitting = false;

    const join = async () => {
      const email = input.value.trim();
      if (!email || submitting) return;

      // Validate at the boundary before touching the network.
      if (!EMAIL_RE.test(email)) {
        form.dataset.state = "error";
        input.focus();
        return;
      }
      form.dataset.state = "input";

      submitting = true;
      input.disabled = true;
      const stored = await submitEmail(email);
      submitting = false;

      if (!stored) {
        // Let the visitor retry rather than silently losing their email.
        input.disabled = false;
        form.dataset.state = "error";
        input.focus();
        return;
      }

      echo.textContent = email;
      form.hidden = true;
      done.hidden = false;
    };

    // Clear the error state as soon as the visitor edits the field again.
    input.addEventListener("input", () => {
      if (form.dataset.state === "error") form.dataset.state = "input";
    });

    // Enter submits (matches the prototype's onKeyDown behavior).
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      join();
    });
  }

  const init = () => {
    mountDrift();
    mountJoin();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
