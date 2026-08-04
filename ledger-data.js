// feria — decorative ledger data for the ASCII energy field.
//
// Each block is one mock API call against the feria ledger, rendered by
// ascii-field.js as an ASCII tree:
//   <method> <path> ·········· <code>
//     ├─ <row text> ......... <value>
//     └─ <row text>
// `kind` picks the resting status hue (ok | warn | agent | dim) that the drifting
// energy blob then lights up as it sweeps across. `method` is optional (agent
// runs and chain appends carry no HTTP verb). Row `value`s are pushed to the
// right edge so the ledger figures form a real column.
//
// Exposed on `window.FERIA_STREAMS` so the renderer can stay a separate module
// while both load as plain <script>s.

(() => {
  "use strict";

  const STREAM_A = [
    { method: "POST", path: "/v1/transactions", code: "201", kind: "ok", rows: [
      { text: "dr 1100 cash", value: "12,480.00" },
      { text: "cr 4000 revenue", value: "12,000.00" },
      { text: "cr 2400 deferred", value: "480.00" },
    ] },
    { path: "agt_reconciler_v3 run_7Kd2", code: "1.4s", kind: "agent", rows: [
      { text: "match stmt_l_0038 → INV-2291" },
      { text: "confidence", value: "0.996" },
    ] },
    { method: "GET", path: "/v1/trial_balance", code: "200", kind: "ok", rows: [
      { text: "period_2026_07 unbalanced", value: "0.00" },
    ] },
    { method: "POST", path: "/v1/transactions", code: "422", kind: "warn", rows: [
      { text: "debits ≠ credits  Δ", value: "40.00", kind: "warn" },
    ] },
    { path: "hash_chain append", code: "ok", kind: "dim", rows: [
      { text: "prev 9f21c0…a4e7" },
      { text: "head c7b83d…10f9" },
    ] },
  ];

  const STREAM_B = [
    { method: "POST", path: "/v1/bills", code: "201", kind: "ok", rows: [
      { text: "vendor mercury", value: "578,400.00" },
      { text: "net-30 due 2026-08", value: "unpaid" },
    ] },
    { path: "agt_ap_clerk over_limit", code: "hold", kind: "warn", rows: [
      { text: "amount", value: "15,000.00", kind: "warn" },
      { text: "review_queue += 1 → human" },
    ] },
    { method: "POST", path: "/v1/transactions", code: "409", kind: "dim", rows: [
      { text: "idempotency recon-88401", value: "hit" },
    ] },
    { method: "POST", path: "/v1/reversals", code: "201", kind: "ok", rows: [
      { text: "reversal_of txn_01J9K6…" },
    ] },
    { path: "webhook transaction.posted", code: "2xx", kind: "dim", rows: [
      { text: "delivered", value: "38ms" },
    ] },
  ];

  const STREAM_C = [
    { path: "bank_feed mercury sync", code: "38", kind: "dim", rows: [
      { text: "matched 37", value: "1 flag" },
    ] },
    { method: "POST", path: "/v1/transactions", code: "201", kind: "ok", rows: [
      { text: "cr 2000 vendors", value: "578,400.00" },
      { text: "seq 4183 → 4184" },
    ] },
    { path: "agt_invoice_bot draft", code: "1.1s", kind: "agent", rows: [
      { text: "INV-2292", value: "net-30" },
    ] },
    { method: "POST", path: "/v1/transactions", code: "402", kind: "warn", rows: [
      { text: "fx fee unmatched", value: "142.80", kind: "warn" },
    ] },
    { method: "GET", path: "/v1/transactions?limit=50", code: "200", kind: "ok", rows: [
      { text: "trial balance agrees", value: "0.00" },
    ] },
    { path: "audit export period_2026_06", code: "signed", kind: "dim", rows: [
      { text: "sha256 3af1…c204" },
    ] },
  ];

  window.FERIA_STREAMS = [STREAM_A, STREAM_B, STREAM_C];
})();
