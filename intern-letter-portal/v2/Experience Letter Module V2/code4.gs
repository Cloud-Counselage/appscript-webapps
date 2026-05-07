/**
 * Combined backend updated to return multiple matching records for an Intern ID,
 * and to generate an experience letter for a specific sheet row (rowIndex).
 *
 * NOTE: Update the CONFIG values below before deploying.
 */

/* ------------------------- CONFIG - UPDATE BEFORE DEPLOY ------------------------- */
var MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/1X5mtZlu4h1ObdtVa9QE8Q_dr_z77QfoVNzKfHUbgXSM/edit";   // Google Sheet URL containing intern profiles (master workbook)
var MASTER_SHEET_NAME = "Sheet1"; 
var LOG_SHEET_URL    = "https://docs.google.com/spreadsheets/d/1oZDOtsAguGktWpISU8iVPskFxxPxCaWWYDE8cDuvAIk/edit";      // Google Sheet URL used as downloads/log workbook
var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1jAqipk4dYiC-pMEQq6O66YOQpK06iHDQ?usp=drive_link";   // Drive folder URL or folder id where PDFs are saved
var DIRECTOR_SIGNATURE_URL = "https://i.ibb.co/B2pB4sG/Screenshot-2023-11-06-230107.png";     // Optional: URL to signature image to put on the doc
var HR_EMAIL = "hr@cloudcounselage.com";             // Email for verification contact shown in certificate
var COMPANY_LOGO_URL = "https://media.licdn.com/dms/image/v2/C4E0BAQGSSw6BJ10Tbw/company-logo_200_200/company-logo_200_200/0/1644811039724?e=2147483647&v=beta&t=ufWJVs4GUMDiZcpuzS3ePKgB1ERK1bUKj-UPVpRBwS4";
/* ---------------------------------------------------------------------------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index.html")
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
function checkStatus(internId) {
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
      { friendly: "Verification Status", keywords: ["verification", "verificationstatus", "verified"] },
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
function generateExperienceLetter(internId, rowIndex) {
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

    var domainCol = findHeaderColByKeywords(headerMaps, ["domain", "domainname", "domain enrollment"]);
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
    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
    var firstName = (String(name || "").split(" ")[0] || name);

    var doc = DocumentApp.create("Experience Letter - " + (internId || "") + " - " + firstName);
    var body = doc.getBody();
    body.setFontFamily("Arial");
    body.setMarginTop(0.5);
    body.setMarginBottom(0.5);
    body.setMarginLeft(30);
    body.setMarginRight(30);

    try {
      var headerTable = body.appendTable();
      var headerRow = headerTable.appendTableRow();
      var left = headerRow.appendTableCell();
      try {
        if (COMPANY_LOGO_URL && COMPANY_LOGO_URL.indexOf("http") === 0) {
          var resp = UrlFetchApp.fetch(COMPANY_LOGO_URL);
          var blob = resp.getBlob();
          var img = left.appendImage(blob);
          img.setWidth(80);
          img.setHeight(80);
        } else {
          left.appendParagraph("[Company Logo]").setBold(true);
        }
      } catch (e) {
        left.appendParagraph("[Company Logo]").setBold(true);
      }
      var right = headerRow.appendTableCell();
      right.appendParagraph("CLOUD COUNSELAGE PVT. LTD.").setBold(true).setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      right.appendParagraph("IT & MANAGEMENT CONSULTING & SERVICES").setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      headerTable.setBorderWidth(0);
      body.appendParagraph("").setSpacingAfter(5);
    } catch (errHeader) {
      Logger.log("Header error: " + errHeader);
    }

    body.appendParagraph("EXPERIENCE LETTER").setBold(true).setFontSize(11).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setUnderline(true).setSpacingAfter(8);
    body.appendParagraph("\nTo Whomsoever It May Concern").setAlignment(DocumentApp.HorizontalAlignment.CENTER).setUnderline(true).setSpacingAfter(8);
    body.appendParagraph("\nDate: " + todayStr).setUnderline(false).setSpacingAfter(8);

    body.appendParagraph("\nThis letter is to certify that " + name + " has successfully completed internship with Cloud Counselage Pvt. Ltd. under our 'Internship Program' in association with our Gift-A-Career Foundation for a duration of 240 hours.").setBold(false).setUnderline(false).setSpacingAfter(5).setAlignment(DocumentApp.HorizontalAlignment.LEFT);

    var domainText = domainName ? (" successfully submitted " + domainName + " project deliverables ") : " successfully submitted project deliverables ";
    body.appendParagraph("\nDuring this engagement, " + firstName + " has abided by the company policies, attended various industry-specific training sessions, and" + domainText + "by following the best practices and project management practices.").setAlignment(DocumentApp.HorizontalAlignment.LEFT).setBold(false).setUnderline(false).setSpacingAfter(5);

    body.appendParagraph("\nThroughout the internship " + firstName + " has worked ethically, followed the instructions, performed necessary research, and worked with minimum supervision. The delivery of the project demonstrates their domain knowledge and skills, a structured approach to problem solving, ability to follow instructions, and inclination to work hard.").setBold(false).setUnderline(false).setAlignment(DocumentApp.HorizontalAlignment.LEFT).setSpacingAfter(5);

    body.appendParagraph("\nThis association has been beneficial for us, and we wish " + firstName + " all the success in their future endeavours.").setAlignment(DocumentApp.HorizontalAlignment.LEFT).setBold(false).setUnderline(false).setSpacingAfter(16);

    body.appendParagraph("\nFor CLOUD COUNSELAGE PVT. LTD.,").setAlignment(DocumentApp.HorizontalAlignment.LEFT).setBold(true).setSpacingAfter(6);

    try {
      if (DIRECTOR_SIGNATURE_URL && DIRECTOR_SIGNATURE_URL.indexOf("http") === 0) {
        var sresp = UrlFetchApp.fetch(DIRECTOR_SIGNATURE_URL);
        var sblob = sresp.getBlob();
        var p = body.appendParagraph("");
        var im = p.appendInlineImage(sblob);
        im.setWidth(140);
        im.setHeight(80);
        p.setSpacingAfter(6);
      }
    } catch (sigErr) {
      body.appendParagraph(DIRECTOR_SIGNATURE_URL || "").setSpacingAfter(6);
    }

    body.appendParagraph("Subhi Shildhankar").setBold(true);
    body.appendParagraph("Co-Founder & Director (HR)").setSpacingAfter(8);

    body.appendParagraph("\nFor background verification please write to " + (HR_EMAIL || "hr@cloudcounselage.com")).setFontSize(6).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(false).setItalic(true);

    try {
      var footer = doc.getFooter();
      if (!footer) footer = doc.addFooter();
      footer.clear();
      footer.appendParagraph("Registered office: Cloud Counselage Pvt. Ltd., 91 Springboard, 1 & 2 Floor, Kagalwala House, Behind Metro House").setFontSize(6).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(false).setItalic(false);
      footer.appendParagraph("Plot No. 175, CST Road, BKC, Kalina, Mumbai - 400098").setBold(false).setItalic(false).setFontSize(6).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      footer.appendParagraph("CIN: U72200MH2015PTC261890, GSTIN: 27AAFCC9601D1ZW").setBold(false).setItalic(false).setFontSize(6).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (footerErr) {
      Logger.log("Footer error: " + footerErr);
    }

    doc.saveAndClose();

    // Convert to PDF blob and save
    var pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
    var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
    if (!folderId) throw new Error("Invalid DRIVE_FOLDER_URL. Provide a valid folder URL or folder ID.");
    // 🔹 Parent folder
    var parentFolder = DriveApp.getFolderById(folderId);
    // 🔹 Intern-ID specific folder (NEW)
    var internFolder = getOrCreateInternFolder(parentFolder, internId);
    // 🔹 Unique filename (multiple experience letters allowed)
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    var fileName = "ExperienceLetter_" + internId + "_" + ts + ".pdf";
    // 🔹 Save inside Intern-ID folder
    var createdFile = internFolder.createFile(pdfBlob.setName(fileName));
    var savedFileUrl = createdFile.getUrl();


    try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (ignored) {}

    // Log WITHOUT URL
    try {
      var logSs = openSpreadsheetByUrlOrThrow(LOG_SHEET_URL);
      var logSheet = logSs.getSheets()[0];
      var domainCol = findHeaderColByKeywords(headerMaps, ["domain", "domain name", "domainname", "domain enrollment"]);
      var domainVal = "";
      if (domainCol) domainVal = sheet.getRange(foundRowIndex, domainCol).getDisplayValue();
      var logRow = [
        new Date(),
        (sheet.getRange(foundRowIndex, internCol).getDisplayValue() || internId),
        name,
        domainVal || "",
        savedFileUrl
      ];
      logSheet.appendRow(logRow);
    } catch (logErr) {
      Logger.log("Failed to log download: " + logErr);
    }

    var pdfBase64 = Utilities.base64Encode(createdFile.getBlob().getBytes());
    return { ok: true, message: "Experience letter generated", pdf: pdfBase64, filename: fileName, savedUrl: savedFileUrl };

  } catch (err) {
    return { ok: false, message: String(err) };
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
