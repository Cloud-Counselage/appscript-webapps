/** IAC portal - Code.gs (updated to add checkAppointmentStatus)
 * - Authenticates user against PROFILE_SHEET_URL (Email + Mobile + Status)
 * - Then checks APPOINTMENT_SHEET_URL for existing appointment PDF (Column T)
 * - Added checkAppointmentStatus(email) for a fresh check on button click
 */ 

/* ========== CONFIG ========== */
const MASTER_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/13XzjO7xYdWSvvdfhAhNWJYCjPMr4fKY7OfZM7yUN0ew/edit";
const EXPERIENCE_ACCESS_SECRET = "ExpLetter@IAC_2026_SecureKey_9fH#2LpX!7z";
// Profile sheet (IAC Portal) - contains Name, Email (col B), Mobile (col C), Intern ID (col D), Status (col E)
const PROFILE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1T3Pyg2QJWYv7XzYVTVoYK1PbsurtlYtDrvvP_HggZtA/edit";

// Appointment sheet (separate) - used by Appointment Letter app; Column T (20) holds the PDF URL
const APPOINTMENT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";

// Web App URLs
const APPOINTMENT_LETTER_APP_URL =
  "https://script.google.com/macros/s/AKfycbznFVqTcCGykbm6p8ZdqHPmfcPwtU0bhj2q259CTbmcRXgcXTx6ydqS3xQTy0e-pkg/exec";

const EXPERIENCE_LETTER_APP_URL =
  "https://script.google.com/macros/s/AKfycbxxPeyMeU2DUvokmO2eoAkOu9IJzVf1w5cfciNNLUTYDk24TYBUN7ArBuiHZy_wUA/exec";

const FEEDBACK_APP_URL = "https://script.google.com/macros/s/AKfycbwESZVAownldRilvxJhQx5gJwapXiFa9nwf0WbN7A_E-iUnNCexN4NCzy9xFRc_3WKL/exec";
function createExperienceToken(internId, email) {
  var payloadObj = {
    internId: String(internId || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    exp: Date.now() + (2 * 60 * 60 * 1000)
  };

  var payload = JSON.stringify(payloadObj);
  var payloadB64 = Utilities.base64EncodeWebSafe(Utilities.newBlob(payload).getBytes());
  var sigB64 = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, EXPERIENCE_ACCESS_SECRET)
  );

  return payloadB64 + "." + sigB64;
}
/* ========================= ENTRY POINT ========================= */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index.html")
    .setTitle("Intern Letter Portal")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ========================= LOGIN VALIDATION ========================= */

/**
 * validateLogin(email, password)
 * - email => matches PROFILE_SHEET_URL column B
 * - password => matches PROFILE_SHEET_URL column C (Mobile)
 * - ensures Status (Column E) === "Active"
 * - then checks appointment sheet (APPOINTMENT_SHEET_URL) for a pre-existing appointment link in Column T (20)
 */
function validateLogin(email, password) {
  if (!email || !password) {
    return { ok: false, message: "Please enter both Email ID and Password." };
  }

  try {
    // open profile sheet
    var profileSs = SpreadsheetApp.openByUrl(PROFILE_SHEET_URL);
    var profileSheet = profileSs.getActiveSheet();
    var profileData = profileSheet.getDataRange().getDisplayValues(); // 2D array

    var inputEmail = String(email).trim().toLowerCase();
    var inputPassword = String(password).trim();

    // find user row in profile sheet (skip header row)
    var foundProfileRow = null; // store row array
    for (var r = 1; r < profileData.length; r++) {
      var row = profileData[r];
      var sheetEmail = String(row[1] || "").trim().toLowerCase(); // Column B
      var sheetMobile = String(row[2] || "").trim(); // Column C
      if (sheetEmail === inputEmail && sheetMobile === inputPassword) {
        foundProfileRow = row;
        break;
      }
    }

    if (!foundProfileRow) {
      return { ok: false, message: "Invalid Email ID or Password." };
    }

    var internId = String(foundProfileRow[3] || "").trim();
    
    // 🔥 CHECK MASTER SHEET (INFO COLUMN)
    var canAccessExperience = checkInfoInMasterSheet(internId);
    var experienceToken = createExperienceToken(internId, inputEmail);
    var feedbackColIndex = null;
    var headers = profileData[0];

    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).toLowerCase().includes("feedback")) {
        feedbackColIndex = c;
        break;
      }
    }

    var feedbackVal = feedbackColIndex !== null ? foundProfileRow[feedbackColIndex] : "";
    var canAccessFeedbackPortal = String(feedbackVal).toLowerCase().trim() === "yes";
    var masterEligible = checkFeedbackEligibility(internId);
    var canAccessFeedback = canAccessFeedbackPortal && masterEligible;

    const feedbackToken = Utilities.base64Encode(
      internId + "|" + new Date().getTime()
    );
    // basic profile info to return
    var resp = {
      ok: true,
      name: foundProfileRow[0],   // Column A
      email: foundProfileRow[1],  // Column B
      internId: internId, // Column D
      experienceToken: experienceToken,
      feedbackToken: feedbackToken,
      experienceApp: EXPERIENCE_LETTER_APP_URL,
      feedbackApp: FEEDBACK_APP_URL,
      canAccessExperience: canAccessExperience,
      canAccessFeedback: canAccessFeedback
    };

    // Now check the Appointment sheet for existing appointment link for this email
    try {
      var apptCheck = _findAppointmentUrlForEmail(inputEmail);
      if (apptCheck && apptCheck.appointmentUrl) {
        resp.appointmentAllowed = false;
        resp.appointmentUrl = apptCheck.appointmentUrl;
      } else {
        resp.appointmentAllowed = true;
        resp.appointmentApp = APPOINTMENT_LETTER_APP_URL;
      }

      return resp;

    } catch (errAppt) {
      // If appointment sheet cannot be read, fail-safe: disallow generation and inform admin
      return {
        ok: false,
        message: "Unable to verify appointment status (appointment sheet access error). Please contact support.",
        error: String(errAppt)
      };
    }

  } catch (err) {
    return {
      ok: false,
      message: "Server error while validating credentials: " + String(err)
    };
  }
}

/* ========================= checkAppointmentStatus =========================
   Called from client when user clicks Appointment button to verify latest status.
   Returns:
   { ok:true, appointmentAllowed:boolean, appointmentUrl:string OR appointmentApp:string }
*/
function checkFeedbackEligibility(internId) {
  if (!internId) return false;

  var ss = SpreadsheetApp.openByUrl(MASTER_SHEET_URL);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getDisplayValues();

  var headers = data[0];

  var infoCol = null;
  var considerCol = null;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).toLowerCase().trim();

    if (h === "info") infoCol = c;
    if (h.includes("consider") && h.includes("experience")) considerCol = c;
  }

  if (infoCol === null || considerCol === null) return false;

  var cleanInternId = String(internId).toLowerCase().replace(/\s+/g,'');

  for (var r = 1; r < data.length; r++) {
    var infoVal = String(data[r][infoCol] || "").toLowerCase().replace(/\s+/g,'');

    if (infoVal.includes(cleanInternId)) {
      var considerVal = String(data[r][considerCol] || "").toLowerCase().trim();
      return considerVal === "yes";
    }
  }

  return false;
}


function checkInfoInMasterSheet(internId) {
  if (!internId) return false;

  var ss = SpreadsheetApp.openByUrl(MASTER_SHEET_URL);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getDisplayValues();

  var headers = data[0];

  var infoCol = null;

  // 🔍 find "Info" column
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).toLowerCase().trim();
    if (h === "info") {
      infoCol = c;
      break;
    }
  }

  if (infoCol === null) return false;

  // 🔥 clean internId
  var cleanInternId = String(internId || "")
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();

  // 🔍 check inside Info column
  for (var r = 1; r < data.length; r++) {
    var infoVal = String(data[r][infoCol] || "")
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();

    // ✅ MATCH USING includes (IMPORTANT)
    if (infoVal.includes(cleanInternId)) {
      return true;
    }
  }

  return false;
}

function checkAppointmentStatus(email) {
  if (!email) {
    return { ok: false, message: "Missing email." };
  }

  try {
    const inputEmail = String(email).toLowerCase().trim();
    const apptCheck = _findAppointmentUrlForEmail(inputEmail);

    if (apptCheck && apptCheck.appointmentUrl) {
      return {
        ok: true,
        appointmentAllowed: false,
        appointmentUrl: apptCheck.appointmentUrl
      };
    }

    return {
      ok: true,
      appointmentAllowed: true,
      appointmentApp: APPOINTMENT_LETTER_APP_URL
    };

  } catch (err) {
    return {
      ok: false,
      message: "Error checking appointment status: " + String(err)
    };
  }
}


/* ========================= helper: find appointment url by email ========================= */

function _findAppointmentUrlForEmail(inputEmail) {
  if (!inputEmail) return {};

  var ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  var sheet = ss.getSheetByName("Sheet1");
  var data = sheet.getDataRange().getDisplayValues();

  var cleanInputEmail = String(inputEmail)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\u00A0/g, '');

  for (var i = 0; i < data.length; i++) {
    var aEmail = String(data[i][1] || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/\u00A0/g, '');

    if (aEmail === cleanInputEmail) {
      var appointmentUrl = String(data[i][19] || '').trim(); // Column T
      return { appointmentUrl: appointmentUrl || '' };
    }
  }
  return {};
}

function simpleTest() {
  const email = "rashidpatel9803@gmail.com"; // apna email
  const ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  const sheet = ss.getSheetByName("Sheet1");
  const data = sheet.getDataRange().getDisplayValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === email) {
      Logger.log("EMAIL MATCH FOUND");
      Logger.log("Column T value = " + data[i][19]);
      return;
    }
  }
  Logger.log("EMAIL NOT FOUND");
}
function debugOpenSheetInfo() {
  var ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  Logger.log("Spreadsheet name: " + ss.getName());
  Logger.log("Spreadsheet ID: " + ss.getId());
  var sheet = ss.getSheetByName("New-Join Form");
  Logger.log("Active sheet name: " + sheet.getName());
  Logger.log("Last Row: " + sheet.getLastRow() + ", Last Col: " + sheet.getLastColumn());
}
function debugShowFirstRows() {
  var ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  var sheet = ss.getSheetByName("Sheet1");
  var data = sheet.getRange(1,1, Math.min(10, sheet.getLastRow()), Math.min(30, sheet.getLastColumn())).getDisplayValues();
  data.forEach(function(row, idx){
    Logger.log("Row " + (idx+1) + " => " + JSON.stringify(row));
  });
}
function debugAppointmentRowDetailed() {
  var testEmail = "rashidpatel9803@gmail.com";
  var ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  var sheet = ss.getSheetByName("Sheet1");
  var data = sheet.getDataRange().getValues(); // raw values
  for (var i = 0; i < data.length; i++) {
    var rawEmail = data[i][1]; // expects column B (index 1)
    if (String(rawEmail || "").trim().toLowerCase() === testEmail.toLowerCase()) {
      Logger.log("FOUND row: " + (i+1));
      var rawT = data[i][19]; // Column T
      Logger.log("Col T raw: [" + rawT + "] length: " + (rawT ? String(rawT).length : 0));
      Logger.log("Col T trimmed: [" + (rawT?String(rawT).trim():"") + "]");
      // char codes (first 30 chars) to detect hidden chars
      var s = String(rawT||"");
      var codes = [];
      for(var j=0;j<Math.min(30,s.length);j++){ codes.push(s.charCodeAt(j)); }
      Logger.log("Col T char codes (first30): " + codes);
      return;
    }
  }
  Logger.log("EMAIL NOT FOUND for: " + testEmail);
}
function DEBUG_checkAppointmentSheet() {
  const ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  const sheet = ss.getSheetByName("Sheet1");
  const data = sheet.getDataRange().getDisplayValues();

  Logger.log("Total Rows = " + data.length);

  for (let i = 0; i < data.length; i++) {
    Logger.log(
      "Row " + (i + 1) +
      " | Email(B)=" + data[i][1] +
      " | URL(T)=" + data[i][19]
    );
  }
}

 


/* ========================= OPTIONAL ========================= */

function ping() {
  return { ok: true };
}
