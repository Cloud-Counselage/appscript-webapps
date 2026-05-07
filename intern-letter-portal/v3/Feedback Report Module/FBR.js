const MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/13XzjO7xYdWSvvdfhAhNWJYCjPMr4fKY7OfZM7yUN0ew/edit";
const MASTER_SHEET = "Sheet1";

const LOGO_DRIVE_ID = "1kJTUbifZQiqcAA2_n6fcgcF3Xwl7Bd3L";
const SUPPORT_EMAIL = "member@industryacademiacommunity.com";

const BOOK_3_URL = "https://docs.google.com/spreadsheets/d/13plAm33JaxMPHs_iAozY15jlYg-zDVLDcP007UWWCHI/edit"; // NEW: Date Issued details
const BOOK_3_SHEET = "Sheet1";
// ==========================================
// HELPER FUNCTIONS (Ultra-Robust Matching)
// ==========================================
const _norm = v => (v === null || v === undefined) ? "" : String(v).replace(/\u00A0/g, " ").trim();
const _normId = v => _norm(v)
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "");
// Strips all spaces, slashes, and symbols to ensure 100% column matching
const _strip = v => String(v).toLowerCase().replace(/[^a-z0-9]/g, ""); 

const _matchCol = (headerRow, possibleNames) => {
  const strippedHeader = headerRow.map(_strip);
  const strippedNames = possibleNames.map(_strip);
  
  // Tier 1: EXACT MATCH Priority
  for (let name of strippedNames) {
    let idx = strippedHeader.indexOf(name);
    if (idx !== -1) return idx;
  }
  
  // Tier 2: SUBSTRING MATCH Fallback
  for (let name of strippedNames) {
    for (let i = 0; i < strippedHeader.length; i++) {
      if (strippedHeader[i].includes(name)) return i; 
    }
  }
  
  return -1;
};

function formatToDDMMYYYY(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!isNaN(parsed)) {
    return Utilities.formatDate(parsed, "IST", "dd-MM-yyyy");
  }
  return String(value);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Strictly adheres to the 1-5 scale mapping you requested
function getRemarkFromScore(score) {
  switch(Number(score)) {
    case 5: return "Excellent";
    case 4: return "Good";
    case 3: return "Satisfactory";
    case 2: return "Needs Improvement"; 
    case 1: return "Poor";
    default: return "";
  }
}

// Reads the EXACT value from the sheet without capping it
function parseRating(rawText) {
  if (rawText === "" || rawText === null || rawText === undefined) return { score: "", remark: "" };
  
  let rawStr = String(rawText).trim();
  let score = NaN;
  
  // Attempt to extract the number from the cell
  let match = rawStr.match(/\d+/);
  if (match) {
     score = parseInt(match[0], 10);
  } else {
     // If the Domain Lead typed text instead of numbers, convert to number
     let lower = rawStr.toLowerCase();
     if (lower.includes("excellent")) score = 5;
     else if (lower.includes("good")) score = 4;
     else if (lower.includes("satisfactory")) score = 3;
     else if (lower.includes("needs improvement")) score = 2;
     else if (lower.includes("poor")) score = 1;
  }

  // If we found a valid 1-5 score, map it. Otherwise, return raw sheet data.
  if (!isNaN(score) && score >= 1 && score <= 5) {
     return { score: score, remark: getRemarkFromScore(score) };
  }
  
  return { score: rawStr, remark: "" };
}

function doGet(e) {
  const token = e.parameter.token || "";

  // 🔒 BLOCK IF TOKEN MISSING
  if (!token) {
    return HtmlService.createHtmlOutput(`
      <h2 style="color:red;text-align:center;margin-top:50px;">
        ❌ Unauthorized Access <br><br>
        Please login through the official portal.
      </h2>
    `);
  }

  // 🔒 VALIDATE TOKEN FORMAT
  try {
    const decoded = Utilities.newBlob(
      Utilities.base64Decode(token)
    ).getDataAsString();

    const parts = decoded.split("|");

    if (parts.length < 2) throw new Error("Invalid");

  } catch (err) {
    return HtmlService.createHtmlOutput(`
      <h2 style="color:red;text-align:center;margin-top:50px;">
        ❌ Invalid or Tampered Token
      </h2>
    `);
  }

  // ✅ VALID → LOAD APP
  const template = HtmlService.createTemplateFromFile('Index');
  template.token = token;

  return template
    .evaluate()
    .setTitle("Feedback Report")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInternIds() {
  const ss = SpreadsheetApp.openByUrl(MASTER_SHEET_URL);
  const sh = ss.getSheetByName(MASTER_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  const header = data[0];
  const colID = _matchCol(header, ["Intern ID"]);
  if (colID === -1) return [];

  const set = {};
  for (let i = 1; i < data.length; i++) {
    const id = _norm(data[i][colID]);
    if (id) set[_normId(id)] = id; 
  }
  return Object.values(set).sort();
}

function getLogoBase64() {
  if (!LOGO_DRIVE_ID || LOGO_DRIVE_ID === "YOUR_EXACT_DRIVE_FILE_ID_HERE") return "";
  
  const match = LOGO_DRIVE_ID.match(/[-\w]{25,}/);
  const cleanId = match ? match[0] : LOGO_DRIVE_ID;

  try {
    const file = DriveApp.getFileById(cleanId);
    const blob = file.getBlob();
    return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
  } catch (e) {
    Logger.log("Logo Error: Make sure script is authorized to access Drive. " + e.message);
    return "";
  }
}

function loadInternDetails(internId, selectedDomain) {
  const searchId = _normId(internId);
  if (!searchId) return { success: false, message: "Intern ID required" };

  let result = { success: false, internId: internId, supportEmail: SUPPORT_EMAIL };

  // ================================
  // A. MASTER SHEET (All Data)
  // ================================
  try {
    const ss = SpreadsheetApp.openByUrl(MASTER_SHEET_URL);
    const sh = ss.getSheetByName(MASTER_SHEET) || ss.getSheets()[0];
    const data = sh.getDataRange().getValues();
    const header = data[0];

    const cId = 0; // Column A = Intern ID (fixed)
    const cName = _matchCol(header, ["Name"]);
    const cDomain = 6;
    const cMentor = _matchCol(header, ["Domain Lead Name"]);

    const cWill = _matchCol(header, ["Final Willingness to learn (score them out of 4)"]);
    const cDomainScore = _matchCol(header, ["Final Domain/ subject knowledge (score them out of 5)"]);
    const cComm = _matchCol(header, ["Final Communication Skills (score them out of 5)"]);
    const cTech = _matchCol(header, ["Final Technical skills set (score them out of 5)"]);
    const cAtt = _matchCol(header, ["Final Attendance & Punctuality (score them out of 5)"]);

    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (
        _normId(data[i][cId]) === searchId &&
        (!selectedDomain || _norm(data[i][cDomain]) === selectedDomain)
      ) {

        result.name = cName !== -1 ? _norm(data[i][cName]) : "N/A";
        result.domain = cDomain !== -1 ? _norm(data[i][cDomain]) : "";
        result.mentor = cMentor !== -1 ? _norm(data[i][cMentor]) : "N/A";

        result.scores = {
          willingness: parseRating(cWill !== -1 ? data[i][cWill] : ""),
          domain: parseRating(cDomainScore !== -1 ? data[i][cDomainScore] : ""),
          communication: parseRating(cComm !== -1 ? data[i][cComm] : ""),
          technical: parseRating(cTech !== -1 ? data[i][cTech] : ""),
          attendance: parseRating(cAtt !== -1 ? data[i][cAtt] : "")
        };

        found = true;
        break;
      }
    }
    // 🔥 FALLBACK DOMAIN FIX
    if (!result.domain) {
      for (let i = 1; i < data.length; i++) {
        if (_normId(data[i][cId]) === searchId) {
          result.domain = _norm(data[i][cDomain]);
          break;
        }
      }
    }

    if (!found) return { success: false, message: "Intern not found in MASTER sheet." };

    result.success = true;

  } catch (e) {
    return { success: false, message: "Error reading MASTER sheet: " + e.message };
  }

  // ================================
  // B. BOOK-3 (Appointment Date via Intern ID)
  // ================================
  result.dateOfAppointment = "N/A";

  try {
    const b3ss = SpreadsheetApp.openByUrl(BOOK_3_URL);
    const b3sh = b3ss.getSheetByName(BOOK_3_SHEET) || b3ss.getSheets()[0];
    const b3data = b3sh.getDataRange().getValues();
    const b3head = b3data[0];

    const cId3 = _matchCol(b3head, ["Intern ID"]);
    const cDate = _matchCol(b3head, ["Date Issued"]);

    if (cId3 !== -1 && cDate !== -1) {
      for (let i = 1; i < b3data.length; i++) {
        if (_normId(b3data[i][cId3]) === searchId) {
          result.dateOfAppointment = formatToDDMMYYYY(b3data[i][cDate]);
          break;
        }
      }
    }

  } catch (e) {
    // silently fail (optional logging)
  }

  return result;
}
function loadInternDetailsByToken(token) {

  if (!token) {
    return { success: false, message: "Access denied" };
  }

  let decoded;
  try {
    decoded = Utilities.newBlob(
      Utilities.base64Decode(token)
    ).getDataAsString();
  } catch (e) {
    return { success: false, message: "Invalid token" };
  }

  const internId = decoded.split("|")[0];

  return loadInternDetails(internId);
}
function getInternDomains(internId) {
  const sheet = SpreadsheetApp.openByUrl(MASTER_SHEET_URL).getSheetByName("Sheet1");

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIndex = 0;
  const domainIndex = 6;

  let domains = [];

  for (let i = 1; i < data.length; i++) {
    if (_normId(data[i][idIndex]) === _normId(internId)) {

      const d = data[i][domainIndex];

      if (d && !domains.includes(d)) {
        domains.push(d);
      }

    }
  }

  return {
    success: true,
    domains: domains
  };
}

function generateAndDownloadPDF(internId, domain) {
  const details = loadInternDetails(internId, domain);
  if (!details.success) throw new Error(details.message);

  const logoDataUrl = getLogoBase64();
  const printDate = Utilities.formatDate(new Date(), "IST", "dd-MM-yyyy");

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: A4; margin: 24mm 18mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; padding: 0; }
      .container { width: 100%; }
      .logo { text-align: center; margin-bottom: 6px; }
      .logo img { max-width: 120px; display: inline-block; }
      .title { text-align: center; font-size: 18px; font-weight: 600; margin: 6px 0 10px; color: #000; }
      
      table { width: 100%; border-collapse: collapse; table-layout: fixed; word-wrap: break-word; margin-top: 15px;}
      thead th { border: 1px solid #333; padding: 6px; text-align: center; background: #f4f4f4; color: #000;}
      tbody td { border: 1px solid #999; padding: 6px; vertical-align: top; color: #000;}
      
      tbody td.sn { text-align: center; font-size: 11px; width: 40px; }
      tbody td.param { text-align: left; }
      tbody td.level { text-align: center; }
      tbody td.remarks { text-align: left; }
      
      .mentor, .date { margin-top: 10px; color: #000; }
      .footer { text-align: center; font-size: 10px; margin-top: 30px; color: #000;}
      
      col.col-sn { width: 50px; }
      col.col-param { width: 35%; }
      col.col-level { width: 20%; }
      col.col-remarks { width: 30%; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">${ logoDataUrl ? `<img src="${logoDataUrl}" alt="logo">` : '' }</div>
      <div class="title">Corporate Feedback for Internship</div>
      
      <div class="meta">
        <p><strong>Name of the candidate:</strong> ${escapeHtml(details.name)}</p>
        <p><strong>Intern ID:</strong> ${escapeHtml(details.internId)}</p>
        <p><strong>Designation:</strong> Intern</p>
        <p><strong>Name of the Organization:</strong> Cloud Counselage Pvt. Ltd.</p>
        <p><strong>Domain:</strong> ${escapeHtml(details.domain || "")}</p>
        <p><strong>Date of Appointment:</strong> ${escapeHtml(details.dateOfAppointment)}</p>
        <br>
      </div>
      
      <table>
        <colgroup>
          <col class="col-sn">
          <col class="col-param">
          <col class="col-level">
          <col class="col-remarks">
        </colgroup>
        <thead>
          <tr>
            <th>Sr.No.</th>
            <th>Parameters</th>
            <th>Level of Satisfaction<br>(out of 5)</th>
            <th>Remarks/Suggestions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sn">1</td>
            <td class="param">Willingness to learn</td>
            <td class="level">${escapeHtml(details.scores.willingness.score)}</td>
            <td class="remarks">${escapeHtml(details.scores.willingness.remark)}</td>
          </tr>
          <tr>
            <td class="sn">2</td>
            <td class="param">Domain/ subject knowledge</td>
            <td class="level">${escapeHtml(details.scores.domain.score)}</td>
            <td class="remarks">${escapeHtml(details.scores.domain.remark)}</td>
          </tr>
          <tr>
            <td class="sn">3</td>
            <td class="param">Communication Skills</td>
            <td class="level">${escapeHtml(details.scores.communication.score)}</td>
            <td class="remarks">${escapeHtml(details.scores.communication.remark)}</td>
          </tr>
          <tr>
            <td class="sn">4</td>
            <td class="param">Technical skills set</td>
            <td class="level">${escapeHtml(details.scores.technical.score)}</td>
            <td class="remarks">${escapeHtml(details.scores.technical.remark)}</td>
          </tr>
          <tr>
            <td class="sn">5</td>
            <td class="param">Attendance & Punctuality</td>
            <td class="level">${escapeHtml(details.scores.attendance.score)}</td>
            <td class="remarks">${escapeHtml(details.scores.attendance.remark)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="mentor"><strong>Industry Mentor:</strong> ${escapeHtml(details.mentor)}</div>
      <div class="date"><strong>Date:</strong> ${printDate}</div>
      <div class="footer">As this is a computer-generated document, no verification is required. Kindly reach out to ${escapeHtml(details.supportEmail)}</div>
    </div>
  </body>
  </html>`;

  const blob = Utilities.newBlob(html, MimeType.HTML);
  const pdfBlob = blob.getAs(MimeType.PDF).setName(`Feedback_${internId}.pdf`);
  return Utilities.base64Encode(pdfBlob.getBytes());
}