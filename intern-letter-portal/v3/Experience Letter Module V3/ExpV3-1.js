/**
 * Combined backend updated to return multiple matching records for an Intern ID,
 * and to generate an experience letter for a specific sheet row (rowIndex).
 *
 * NOTE: Update the CONFIG values below before deploying.
 */

/* ------------------------- CONFIG - UPDATE BEFORE DEPLOY ------------------------- */
var EXPERIENCE_ACCESS_SECRET = "ExpLetter@IAC_2026_SecureKey_9fH#2LpX!7z";
var MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/13XzjO7xYdWSvvdfhAhNWJYCjPMr4fKY7OfZM7yUN0ew/edit?gid=0#gid=0";   // Google Sheet URL containing intern profiles (master workbook)
var MASTER_SHEET_NAME = "Sheet1"; 
var LOG_SHEET_URL    = "https://docs.google.com/spreadsheets/d/1oZDOtsAguGktWpISU8iVPskFxxPxCaWWYDE8cDuvAIk/edit";      // Google Sheet URL used as downloads/log workbook
var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1jAqipk4dYiC-pMEQq6O66YOQpK06iHDQ?usp=drive_link";   // Drive folder URL or folder id where PDFs are saved
var DIRECTOR_SIGNATURE_URL = "https://i.ibb.co/B2pB4sG/Screenshot-2023-11-06-230107.png";     // Optional: URL to signature image to put on the doc
var HR_EMAIL = "hr@cloudcounselage.com";             // Email for verification contact shown in certificate
var COMPANY_LOGO_URL = "https://media.licdn.com/dms/image/v2/C4E0BAQGSSw6BJ10Tbw/company-logo_200_200/company-logo_200_200/0/1644811039724?e=2147483647&v=beta&t=ufWJVs4GUMDiZcpuzS3ePKgB1ERK1bUKj-UPVpRBwS4";
/* ---------------------------------------------------------------------------- */

function doGet(e) {
  var internId = e.parameter.internId || "";

  var template = HtmlService.createTemplateFromFile("index");
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : "";
  template.SERVER_ACCESS_TOKEN = token;

  return template.evaluate()
    .setTitle("Experience Letter Web App")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- Helpers ---------- */
function getFolderIdFromUrl(urlOrId) {
  if (!urlOrId) return null;
  var s = String(urlOrId);
  var m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return null;
}
function verifyExperienceToken(token) {
  if (!token) return { ok: false, message: "Unauthorized access, Kindly make the secure login through the Portal." };

  try {
    var parts = String(token).split(".");
    if (parts.length !== 2) return { ok: false, message: "Invalid token." };

    var payloadJson = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();

    var expectedSig = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payloadJson, EXPERIENCE_ACCESS_SECRET)
    );

    if (expectedSig !== parts[1]) return { ok: false, message: "Invalid token." };

    var payload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) return { ok: false, message: "Token expired." };

    return {
      ok: true,
      internId: payload.internId,
      email: payload.email
    };

  } catch (e) {
    return { ok: false, message: "Token verification failed." };
  }
}
/**
 * Returns Intern-ID specific folder inside parent folder.
 * If folder does not exist, it creates one.
 */
function getOrCreateInternFolder(parentFolder, internId) {
  if (!parentFolder || !internId) {
    throw new Error("Parent folder or Intern ID missing");
  }

  var folders = parentFolder.getFoldersByName(internId);
  if (folders.hasNext()) {
    return folders.next(); // existing folder
  }

  // create new folder
  return parentFolder.createFolder(internId);
}


function openSpreadsheetByUrlOrThrow(url) {
  try {
    return SpreadsheetApp.openByUrl(url);
  } catch (e) {
    throw new Error("Cannot open Google Sheet at: " + url + ". Ensure URL is correct and the script owner has access.");
  }
}

function getMasterSheet() {
  var ss = openSpreadsheetByUrlOrThrow(MASTER_SHEET_URL);
  if (MASTER_SHEET_NAME && MASTER_SHEET_NAME.trim()) {
    var s = ss.getSheetByName(MASTER_SHEET_NAME.trim());
    if (!s) throw new Error("Master sheet name '" + MASTER_SHEET_NAME + "' not found in " + MASTER_SHEET_URL);
    return s;
  }
  return ss.getSheets()[0];
}

function getHeaderMaps(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return { original: {}, normalized: {} };
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  var original = {};
  var normalized = {};
  for (var i = 0; i < headers.length; i++) {
    var hdr = String(headers[i] || "").trim();
    if (!hdr) continue;
    original[hdr] = i + 1;
    var norm = hdr.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized[norm]) normalized[norm] = { orig: hdr, col: i + 1 };
  }
  return { original: original, normalized: normalized, headerList: headers };
}

function normalizeInternId(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[\s\-]+/g, '').toLowerCase();
}

function findInternIdColumnIndex(headerMaps) {
  var normalized = headerMaps.normalized;
  var candidates = [
    "internid","intern","ipid","ip","id","internno","internnumber","interncode"
  ];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (normalized[c]) return normalized[c].col;
  }
  var keys = Object.keys(headerMaps.original);
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j].toLowerCase();
    if (k.indexOf("intern") !== -1 || k.indexOf("ip") !== -1) return headerMaps.original[keys[j]];
  }
  return 1;
}

function findHeaderColByKeywords(headerMaps, keywords) {
  if (!keywords || !keywords.length) return null;
  var normMap = headerMaps.normalized;
  for (var i = 0; i < keywords.length; i++) {
    var k = keywords[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!k) continue;
    if (normMap[k]) return normMap[k].col;
  }
  var origKeys = Object.keys(headerMaps.original);
  for (var i2 = 0; i2 < origKeys.length; i2++) {
    var orig = origKeys[i2];
    var low = orig.toLowerCase();
    for (var j = 0; j < keywords.length; j++) {
      var tk = keywords[j].toLowerCase();
      if (tk && low.indexOf(tk) !== -1) return headerMaps.original[orig];
    }
  }
  return null;
}

/* ---------- Public functions ---------- */

/**
 * checkStatus(internId)
 * Returns multiple matching records for the given internId (if present multiple domains/rows exist).
 * Response:
 * {
 *   ok: true/false,
 *   internId: actual intern id string (from sheet or query),
 *   name: (best-effort name),
 *   email: (if found),
 *   records: [
 *     { rowIndex: 5, data: {friendlyField: value, ...}, projectStatus: "...", projectStatusNormalized: "..." },
 *     ...
 *   ]
 * }
 */
function checkStatus(internId, accessToken) {
  var auth = verifyExperienceToken(accessToken);
  if (!auth.ok) return auth;

  var allowedInternId = auth.internId;

  if (normalizeInternId(internId) !== normalizeInternId(allowedInternId)) {
    return { ok: false, message: "You can only access your own record" };
  }

  // 🔥 FORCE FIX
  internId = allowedInternId;
  
  // 🔒 SECURITY
  if (!allowedInternId) {
    return { ok: false, message: "Unauthorized access" };
  }

  if (normalizeInternId(internId) !== normalizeInternId(allowedInternId)) {
    return { ok: false, message: "You can only access your own record" };
  }
  internId = allowedInternId;
  try {
    if (!internId) throw new Error("Please provide an Intern ID (e.g., IP-0001).");

    var sheet = getMasterSheet();
    var headerMaps = getHeaderMaps(sheet);

    var internCol = findInternIdColumnIndex(headerMaps);
    var lastRow = Math.max(2, sheet.getLastRow());
    var numRows = lastRow - 1;
    if (numRows <= 0) return { ok: false, message: "No records found in master sheet." };

    var internVals = sheet.getRange(2, internCol, numRows, 1).getValues();
    var queryNorm = normalizeInternId(internId);

    var foundRowIndexes = [];
    for (var r = 0; r < internVals.length; r++) {
      var v = internVals[r][0];
      if (normalizeInternId(v) === queryNorm) {
        foundRowIndexes.push(r + 2);
      }
    }
    if (!foundRowIndexes.length) return { ok: false, message: "No record found for Intern ID: " + internId };
    

    // Desired friendly fields
    var desiredMap = [
      { friendly: "Name", keywords: ["name", "full name", "profile", "profileinfo"] },
      { friendly: "College/ University Name", keywords: ["college", "university", "collegeuniversity", "college name", "university name"] },
      { friendly: "Domain Name", keywords: ["Domain Name", "domainname", "domain enrollment", "domainenrollment"] },
      { friendly: "Verification Status", keywords: ["verification", "Verification Status", "verified"] },
      { friendly: "Final Project Checking Result", keywords: ["Submission Status 2", "finalproject", "project checking result", "projectcheckingresult", "finalprojectcheckingresult"] },
      { friendly: "Final Status", keywords: ["FinalStatus"] },
      { friendly: "Consider for Experience Letter", keywords: ["consider for experience", "considerforexperience", "consider for experience letter", "consider", "consider_for_experience_letter"] }
    ];

    var records = [];
    var name = "";
    var email = "";

    for (var i = 0; i < foundRowIndexes.length; i++) {
      var rowIndex = foundRowIndexes[i];
      var dataObj = {};
      for (var j = 0; j < desiredMap.length; j++) {
        var item = desiredMap[j];
        var col = findHeaderColByKeywords(headerMaps, item.keywords);
        if (col) {
          var val = sheet.getRange(rowIndex, col).getDisplayValue();
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            dataObj[item.friendly] = val;
          }
        }
      }
      // Ensure Intern ID present
      var actualInternIdValue = sheet.getRange(rowIndex, internCol).getDisplayValue();
      if (actualInternIdValue && actualInternIdValue !== "") dataObj["Intern ID"] = actualInternIdValue;

      // capture name/email best-effort (use first record's values)
      if (!name) {
        name = dataObj["Name"] || sheet.getRange(rowIndex, 1).getDisplayValue() || "";
      }
      if (!email) {
        var emailCol = findHeaderColByKeywords(headerMaps, ["email", "emailid", "email id", "e-mail"]);
        if (emailCol) email = sheet.getRange(rowIndex, emailCol).getDisplayValue();
      }

      // project status
      var projStatusRaw = dataObj["Final Status"] || dataObj["Final Project Checking Result"] || "";
      var projStatusNorm = String(projStatusRaw || "").trim().toLowerCase();

      records.push({
        rowIndex: rowIndex,
        data: dataObj,
        projectStatus: projStatusRaw,
        projectStatusNormalized: projStatusNorm
      });
    }

    return {
      ok: true,
      internId: (records[0] && records[0].data && records[0].data["Intern ID"]) || internId,
      name: name,
      email: email,
      records: records
    };

  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

/**
 * generateExperienceLetter(internId, rowIndex)
 * Generates PDF for the specific sheet row (rowIndex). If rowIndex is not provided, it falls back to searching by internId and uses the first match.
 * Logs the generation event (timestamp, internId, name, email, filename) WITHOUT storing the PDF URL.
 */
function generateExperienceLetter(internId, rowIndex, accessToken) {
  var auth = verifyExperienceToken(accessToken);
  if (!auth.ok) return auth;

  var allowedInternId = auth.internId;

  if (normalizeInternId(internId) !== normalizeInternId(allowedInternId)) {
    return { ok: false, message: "You can only access your own record" };
  }

  internId = allowedInternId;
  
  // 🔒 SECURITY
  if (!allowedInternId) {
    return { ok: false, message: "Unauthorized access" };
  }

  if (normalizeInternId(internId) !== normalizeInternId(allowedInternId)) {
    return { ok: false, message: "You can only access your own record" };
  }
  internId = allowedInternId;
  try {
    if (!internId && !rowIndex) throw new Error("No Intern ID or rowIndex provided.");

    var sheet = getMasterSheet();
    var headerMaps = getHeaderMaps(sheet);
    var internCol = findInternIdColumnIndex(headerMaps);

    // If rowIndex not provided, locate first matching row
    var foundRowIndex = -1;
    if (rowIndex && Number(rowIndex) > 0) {
      foundRowIndex = Number(rowIndex);
    } else {
      var lastRow = Math.max(2, sheet.getLastRow());
      var numRows = lastRow - 1;
      var internVals = sheet.getRange(2, internCol, numRows, 1).getValues();
      var qNorm = normalizeInternId(internId);
      for (var r = 0; r < internVals.length; r++) {
        var v = internVals[r][0];
        if (normalizeInternId(v) === qNorm) {
          foundRowIndex = r + 2;
          break;
        }
      }
    }
    if (foundRowIndex === -1) throw new Error("No record found for provided Intern ID / rowIndex.");

    // Read essential fields for the letter
    var name = "";
    var nameCol = findHeaderColByKeywords(headerMaps, ["name", "full name", "profile"]);
    if (nameCol) name = sheet.getRange(foundRowIndex, nameCol).getDisplayValue();
    if (!name) name = sheet.getRange(foundRowIndex, 1).getDisplayValue() || "";

    var domainCol = findHeaderColByKeywords(headerMaps, ["Domain Name","domain", "domainname", "domain enrollment"]);
    var domainName = domainCol ? sheet.getRange(foundRowIndex, domainCol).getDisplayValue() : "";

    // ✅ ONLY condition for Experience Letter
    var considerCol = findHeaderColByKeywords(headerMaps, [
      "Consider for Experience Letter",
      "consider for experience",
      "considerforexperienceletter"
    ]);
    var considerVal = considerCol
    ? sheet.getRange(foundRowIndex, considerCol).getDisplayValue()
    : "";

    var considerNorm = String(considerVal || "").trim().toLowerCase();
    if (considerNorm !== "yes") {
      return {
        ok: false,
        message: "not_eligible",
        userMessage: "You are currently not eligible for Experience Letter."
      };
    }     

      

    /*var projectCol = findHeaderColByKeywords(headerMaps, ["project status", "final status", "status", "projectstatus"]);
    var projectStatus = projectCol ? sheet.getRange(foundRowIndex, projectCol).getDisplayValue() : "";
    if (!projectStatus) {
      var alt = findHeaderColByKeywords(headerMaps, ["final status", "finalproject", "final project checking result"]);
      if (alt) projectStatus = sheet.getRange(foundRowIndex, alt).getDisplayValue();
    }
    if (!projectStatus) throw new Error("Cannot determine project status for the selected record.");

    var statusNorm = String(projectStatus).trim().toLowerCase();
    if (statusNorm !== "accepted") {
      if (statusNorm === "incomplete") {
        return { ok: false, message: "incomplete", userMessage: "Kindly reach out to member@industryacademiacommunity.com, as your project submission is marked as incomplete" };
      } else if (statusNorm === "under review" || statusNorm === "underreview") {
        return { ok: false, message: "under_review", userMessage: "Kindly wait for some time for the team to inform you details over your mail regarding the experience letter" };
      } else {
        return { ok: false, message: "not_accepted", userMessage: "Experience letter generation is allowed only if project status is 'Accepted'." };
      }
    }*/
    

    // Build the document
    

    // ✅ Date format
    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");

    // ✅ Load HTML template
    const TEMPLATE_ID = "18WMt8JCOp1-OuQqD9sZ_DwFoHwuRjQDRITy_MDhwof0";

    const copy = DriveApp.getFileById(TEMPLATE_ID)
      .makeCopy("Experience Letter - " + name);

    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();

    // 🔥 Replace placeholders
    body.replaceText("{{NAME}}", name);
    body.replaceText("{{DATE}}", todayStr);
    body.replaceText("{{DOMAIN}}", domainName || "the assigned");

    doc.saveAndClose();

    // 🔥 Convert to PDF
    var pdfBlob = DriveApp.getFileById(copy.getId()).getAs(MimeType.PDF);
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    var fileName = "ExperienceLetter_" + internId + "_" + ts + ".pdf";

    pdfBlob.setName(fileName);

    // Convert to PDF blob and save
    
    var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
    if (!folderId) throw new Error("Invalid DRIVE_FOLDER_URL. Provide a valid folder URL or folder ID.");
    // 🔹 Parent folder
    var parentFolder = DriveApp.getFolderById(folderId);
    // 🔹 Intern-ID specific folder (NEW)
    var internFolder = getOrCreateInternFolder(parentFolder, internId);
    // 🔹 Unique filename (multiple experience letters allowed)
    // 🔹 Save inside Intern-ID folder
    var createdFile = internFolder.createFile(pdfBlob);
    var savedFileUrl = createdFile.getUrl();


    

    // Log WITHOUT URL
    try {
      var logSs = openSpreadsheetByUrlOrThrow(LOG_SHEET_URL);
      var logSheet = logSs.getSheets()[0];
      var domainName = "";
      var domainCol =
        headerMaps.original["Domain Name"] ||
        headerMaps.original["Domain"] ||
        null;
      if (domainCol) {
        domainName = sheet.getRange(foundRowIndex, domainCol).getDisplayValue();
      }
      var logRow = [
        new Date(),
        (sheet.getRange(foundRowIndex, internCol).getDisplayValue() || internId),
        name,
        domainName || "",
        savedFileUrl
      ];
      // 🔒 Check if already logged (by Intern ID)
      var existingData = logSheet.getDataRange().getValues();
      var alreadyExists = false;
      for (var i = 1; i < existingData.length; i++) {
        var existingInternId = String(existingData[i][1] || "").trim(); // Column 2 = Intern ID

        if (normalizeInternId(existingInternId) === normalizeInternId(internId)) {
          alreadyExists = true;
          break;
        }
      }
      if (!alreadyExists) {
        logSheet.appendRow(logRow);
      }
    } catch (logErr) {
      Logger.log("Failed to log download: " + logErr);
    }

    var pdfBase64 = Utilities.base64Encode(createdFile.getBlob().getBytes());
    return { ok: true, message: "Experience letter generated", pdf: pdfBase64, filename: fileName, savedUrl: savedFileUrl };

  } catch (err) {
    return { ok: false, message: String(err) };
  }
}
function triggerPermission() {
  try {
    var docId = "18WMt8JCOp1-OuQqD9sZ_DwFoHwuRjQDRITy_MDhwof0"; // Sirf ID, pura link nahi
    var doc = DocumentApp.openById(docId);
    Logger.log("Success! Doc Name: " + doc.getName());
  } catch (e) {
    Logger.log("Error logic: " + e.toString());
    // Agar yahan 'Document is inaccessible' aata hai, toh ID check karein.
  }
}

/** Optional helper to authorize access once */
function authorizeOnce() {
  var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
  if (!folderId) throw new Error("Set DRIVE_FOLDER_URL in authorizeOnce()");
  DriveApp.getFolderById(folderId);
  openSpreadsheetByUrlOrThrow(MASTER_SHEET_URL);
  openSpreadsheetByUrlOrThrow(LOG_SHEET_URL);
  Logger.log("Authorization test calls executed.");
}
