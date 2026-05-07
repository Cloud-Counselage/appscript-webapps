/** IAC portal - Code.gs (updated to add checkAppointmentStatus)
 * - Authenticates user against PROFILE_SHEET_URL (Email + Mobile + Status)
 * - Then checks APPOINTMENT_SHEET_URL for existing appointment PDF (Column T)
 * - Added checkAppointmentStatus(email) for a fresh check on button click
 */

/* ========== CONFIG ========== */

// Profile sheet (IAC Portal) - contains Name, Email (col B), Mobile (col C), Intern ID (col D), Status (col E)
const PROFILE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1T3Pyg2QJWYv7XzYVTVoYK1PbsurtlYtDrvvP_HggZtA/edit";

// Appointment sheet (separate) - used by Appointment Letter app; Column T (20) holds the PDF URL
const APPOINTMENT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";

// Web App URLs
const APPOINTMENT_LETTER_APP_URL =
  "https://script.google.com/macros/s/AKfycbz24Lt1-r24oaHIAyCuYD3I8TCTwerIHLKi0yhC8e6wsAOBuzHifEPrx0g9rWs0p84/exec";

const EXPERIENCE_LETTER_APP_URL =
  "https://script.google.com/macros/s/AKfycbzjdQ_EAz6jUvCB5L5d4MChdK5snt_--MozyA2E2yJqHhbyMtdAc1jVI7hWPsrl_IwQ/exec";

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

    

    // basic profile info to return
    var resp = {
      ok: true,
      name: foundProfileRow[0],   // Column A
      email: foundProfileRow[1],  // Column B
      internId: foundProfileRow[3], // Column D
      experienceApp: EXPERIENCE_LETTER_APP_URL
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
