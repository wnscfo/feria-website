// feria — teaser landing page behavior.
//  - handles the email waitlist input (Enter to join)
// The decorative ASCII energy field behind the page is rendered separately by
// ascii-field.js.

(() => {
  "use strict";

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

      // Swap to the confirmation panel immediately in a loading/skeleton state
      // so the (often slow) network round-trip has visible feedback instead of
      // a frozen, disabled input.
      echo.textContent = email;
      form.hidden = true;
      done.hidden = false;
      done.dataset.state = "loading";

      const stored = await submitEmail(email);
      submitting = false;

      if (!stored) {
        // Roll back to the form so the visitor can retry rather than silently
        // losing their email.
        done.hidden = true;
        delete done.dataset.state;
        form.hidden = false;
        input.disabled = false;
        form.dataset.state = "error";
        input.focus();
        return;
      }

      // Reveal the real confirmation now that the email is stored.
      done.dataset.state = "ready";
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
    mountJoin();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
