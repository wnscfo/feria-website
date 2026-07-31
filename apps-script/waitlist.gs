/**
 * feria waitlist — Google Apps Script backend.
 *
 * Receives POSTed emails from the feria.co landing page and appends each one
 * as a row in the bound Google Sheet. Acts as a free, no-server "email cache".
 *
 * ── One-time setup ────────────────────────────────────────────────────────
 * 1. Create a Google Sheet (sheet.new). Name tab "waitlist".
 *    Row 1 headers (optional): timestamp | email | source | user_agent
 * 2. Extensions → Apps Script. Delete the stub, paste this whole file.
 * 3. Deploy → New deployment → type "Web app".
 *      - Execute as:  Me
 *      - Who has access:  Anyone
 *    Copy the "/exec" Web app URL it gives you.
 * 4. Put that URL into feria.js  →  WAITLIST_ENDPOINT.
 *
 * Re-deploy (Deploy → Manage deployments → Edit → New version) after any edit.
 */

// Basic email shape check. Fail fast on obviously-bad input at the boundary.
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  try {
    var email = "";
    var source = "";
    var ua = "";

    // Accept both form-encoded (no CORS preflight) and JSON bodies.
    if (e && e.parameter && e.parameter.email) {
      email = String(e.parameter.email).trim();
      source = String(e.parameter.source || "").trim();
    } else if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      email = String(body.email || "").trim();
      source = String(body.source || "").trim();
    }

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json_({ ok: false, error: "invalid_email" });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("waitlist")
      || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // De-dupe: skip if this email already exists in column B.
    var existing = sheet.getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1)
      .getValues()
      .map(function (r) { return String(r[0]).trim().toLowerCase(); });
    if (existing.indexOf(email.toLowerCase()) !== -1) {
      return json_({ ok: true, deduped: true });
    }

    sheet.appendRow([new Date(), email, source || "feria.co", ua]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Health check for GET (visiting the URL in a browser).
function doGet() {
  return json_({ ok: true, service: "feria-waitlist" });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
