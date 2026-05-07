/**
 * Backend for Appointment Letter generator
 * - Live email check for existing interns (checkEmailAndFetch)
 * - Email duplicate check on submit (submitForm)
 * - If email already exists → update row + regenerate appointment letter with latest info
 * - If new email → generate appointment letter, save PDF in Drive folder, and update sheet
 */

function doGet(e) {
  const email = e && e.parameter && e.parameter.email;

  if (!email) {
    return HtmlService.createHtmlOutput("Invalid access.");
  }

  const result = _findAppointmentUrlForEmail(email);

  // 🔒 If appointment already generated → BLOCK FORM
  if (result && result.appointmentUrl) {
    const tpl = HtmlService.createTemplateFromFile("AlreadyGenerated");
    tpl.appointmentUrl = result.appointmentUrl;

    return tpl.evaluate()
      .setTitle("Appointment Letter")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 🟢 First-time user → allow form
  const tpl = HtmlService.createTemplateFromFile("Index");
  tpl.email = email;

  return tpl.evaluate()
    .setTitle("GPI New Joinee Form")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/**
 * Checks appointment sheet for existing appointment letter URL
 * Uses Column B = Email, Column T = Appointment Letter URL
 */
function _findAppointmentUrlForEmail(inputEmail) {
  if (!inputEmail) return {};

  const APPOINTMENT_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";

  const SHEET_NAME = "Sheet1"; // 👈 EXACT sheet tab name

  const ss = SpreadsheetApp.openByUrl(APPOINTMENT_SHEET_URL);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log("Sheet not found:", SHEET_NAME);
    return {};
  }

  const data = sheet.getDataRange().getDisplayValues();
  const targetEmail = String(inputEmail).toLowerCase().trim();

  for (let i = 0; i < data.length; i++) {
    const rowEmail = String(data[i][1] || "").toLowerCase().trim(); // Column B

    if (rowEmail === targetEmail) {
      const appointmentUrl = String(data[i][19] || "").trim(); // Column T
      return { appointmentUrl };
    }
  }

  return {};
}


/** Helper: extract folder id from a full Drive URL or return the id if direct */
function getFolderIdFromUrl(urlOrId) {
  if (!urlOrId) return null;
  // pattern /folders/<id>
  var m = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  // pattern ?id=<id> or &id=<id>
  m = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  // maybe user pasted only the id
  if (/^[a-zA-Z0-9_-]{10,}$/.test(urlOrId)) return urlOrId;
  return null;
}

/**
 * Helper: Searches for an existing folder with the Intern ID name. 
 * If not found, it creates one inside the parent folder.
 * @param {GoogleAppsScript.Drive.Folder} parentFolder The main Drive folder.
 * @param {string} internId The Intern ID to use as the folder name.
 * @returns {GoogleAppsScript.Drive.Folder} The Intern-specific folder.
 */
function getOrCreateInternFolder(parentFolder, internId) {
  var folders = parentFolder.getFoldersByName(internId);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    // Folder not found, create a new one inside the parent folder
    return parentFolder.createFolder(internId);
  }
}

/**
 * Called from frontend when user enters email (on blur)
 * - Checks if email exists in Sheet
 * - If exists → returns: internId, previous form data, and appointment letter PDF (base64)
 * - If not exists → returns exists:false
 */
function checkEmailAndFetch(email) {
  try {
    if (!email) {
      return { ok: true, exists: false };
    }

    // --------------- CONFIG ---------------
    var SHEET_URL = "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";
    var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1CKq39MpVU8vKoRqkbCdifvuyLdtV2Rxy?usp=drive_link";

    var COMPANY_LOGO_URL = "https://media.licdn.com/dms/image/v2/C4E0BAQGSSw6BJ10Tbw/company-logo_200_200/company-logo_200_200/0/1644811039724?e=2147483647&v=beta&t=ufWJVs4GUMDiZcpuzS3ePKgB1ERK1bUKj-UPVpRBwS4";
    var DIRECTOR_SIGNATURE_URL = "https://i.ibb.co/9vWwRj7/harshada-sign-crop.png";
    // -------------------------------------

    // open sheet
    var sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();

    // derive folder id robustly
    var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
    if (!folderId) {
      throw new Error("Invalid DRIVE_FOLDER_URL. Provide a full Drive folder URL (contains '/folders/<id>') or the folder ID.");
    }

    var parentFolder = DriveApp.getFolderById(folderId);

    // column mapping (Indices are 1-based)
    var nameColIndex = 1; 		// A: Name
    var emailColIndex = 2; 		// B: Email
    var internIDColIndex = 5; // E: Intern ID

    var dataRange = sheet.getDataRange();
    var data = dataRange.getDisplayValues();

    var incomingEmail = String(email || "").trim().toLowerCase();
    var foundRowIndex = -1;
    var foundRow = null;

    for (var i = 0; i < data.length; i++) {
      var sheetEmail = String(data[i][emailColIndex - 1] || "").trim().toLowerCase();
      if (sheetEmail && sheetEmail === incomingEmail) {
        foundRowIndex = i + 1; // 1-based
        foundRow = data[i];
        break;
      }
    }

    if (foundRowIndex === -1 || !foundRow) {
      // email not found
      return { ok: true, exists: false };
    }

    var internId = foundRow[internIDColIndex - 1];
    var name = foundRow[nameColIndex - 1];

    // Get Intern-specific folder
    var internFolder = getOrCreateInternFolder(parentFolder, internId);


    // Always regenerate appointment letter using latest Sheet data
    var expectedPdfName = "Appointment_" + internId + ".pdf";
    // Remove old appointment letter if it exists
    var oldFiles = internFolder.getFilesByName(expectedPdfName); 
    while (oldFiles.hasNext()) {
      oldFiles.next().setTrashed(true);
    }
    // Generate fresh PDF with latest name from Sheet
    var pdfResult = generateAppointmentPdfBlob( // Changed to pdfResult
      name || "Intern",
      internId,
      internFolder // Use internFolder as destination
    );

    // ✅ STEP 2: sheet update add karo
    // IMPORTANT: Update Column T (20) with latest appointment letter URL
    sheet.getRange(foundRowIndex, 20).setValue(pdfResult.url);
    var pdfBlob = pdfResult.blob;
    // ------------------------------------

    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

    // Build formData object for auto-fill (including file links)
    var formData = {
      name: 					foundRow[0] || "",
      email: 					foundRow[1] || email,
      motivation: 			foundRow[8] || "",
      meetingTime: 			foundRow[9] || "",
      preEnrol: 			foundRow[10] || "",
      enrolProcess: 	  foundRow[11] || "",
      inductionInfo: 	  foundRow[12] || "",
      inductionContact: foundRow[13] || "",
      careerSupport: 	  foundRow[14] || "",
      expectations: 	  foundRow[15] || "",
      suggestions: 	  foundRow[16] || "",
      aadhaarNumber: 	  foundRow[17] || "",
      consent: String(foundRow[18] || "").trim().toLowerCase() === "yes",
      passportLink: 	  foundRow[5] || "",
      aadhaarLink: 		  foundRow[6] || "",
      marksheetLink: 	  foundRow[7] || ""
    };

    return {
      ok: true,
      exists: true,
      message: "This email already exists: " + email +
               ". You can download your appointment letter.",
      email: email,
      internId: internId,
      pdf: pdfBase64,
      formData: formData
    };

  } catch (err) {
    console && console.error ? console.error(err) : Logger.log(err);
    return { ok: false, exists: false, message: String(err) };
  }
}


function submitForm(formData, passportPhoto, aadhaarFile, marksheetFile) {
  try {
    if (!formData || !formData.name || !formData.email) {
      throw new Error("Missing required fields (name/email).");
    }

    // --------------- CONFIG ---------------
    var SHEET_URL = "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";
    var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1CKq39MpVU8vKoRqkbCdifvuyLdtV2Rxy?usp=drive_link";

    var COMPANY_LOGO_URL = "https://media.licdn.com/dms/image/v2/C4E0BAQGSSw6BJ10Tbw/company-logo_200_200/company-logo_200_200/0/1644811039724?e=2147483647&v=beta&t=ufWJVs4GUMDiZcpuzS3ePKgB1ERK1bUKj-UPVpRBwS4";
    var DIRECTOR_SIGNATURE_URL = "https://i.ibb.co/9vWwRj7/harshada-sign-crop.png";
    // -------------------------------------

    var sheet;
    try {
      sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    } catch (e) {
      throw new Error("Cannot open Google Sheet. Please verify SHEET_URL and that the script owner can access the sheet.");
    }

    var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
    if (!folderId) {
      throw new Error("Invalid DRIVE_FOLDER_URL. Provide a full Drive folder URL (contains '/folders/<id>') or the folder ID.");
    }

    var parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(folderId);
    } catch (e) {
      throw new Error(
        "Cannot access Drive folder with ID: " + folderId +
        ".\n* Ensure the folder ID / URL is correct.\n* Ensure the Apps Script project owner has EDIT access to that folder."
      );
    }

    // (Code for checking existing intern and generating next Intern ID remains the same)
    
    var nameColIndex = 1;
    var emailColIndex = 2;
    var internIDColIndex = 5;

    var dataRange = sheet.getDataRange();
    var data = dataRange.getDisplayValues();
    var existingRowIndex = -1;
    var existingInternID = null;
    var existingName = null;
    var existingRowData = null;

    var incomingEmail = String(formData.email || "").trim().toLowerCase();

    for (var i = 0; i < data.length; i++) {
      var sheetEmail = String(data[i][emailColIndex - 1] || "")
        .trim()
        .toLowerCase();

      if (sheetEmail && sheetEmail === incomingEmail) {
        existingRowIndex = i + 1;
        existingInternID = data[i][internIDColIndex - 1];
        existingName = data[i][nameColIndex - 1];
        existingRowData = data[i];
        break;
      }
    }

    var isExistingIntern = !!existingInternID;
    var internIdToUse = existingInternID; // Use existing ID for existing intern

    var today = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd-MM-yyyy"
    );
    // 🔒 HARD LOCK: if appointment letter already generated, block edits
    if (isExistingIntern && existingRowData && existingRowData[19]) {
      return {
        ok: false,
        locked: true,
         message: "Your appointment letter has already been generated. Editing or resubmission is not Permitted."
       };
      }  // Column T


    

    // CASE B: new intern → Generate new Intern ID first
    if (!isExistingIntern) {

     var BASE_START = 11127; // ✅ force starting point
     var lastRow = sheet.getLastRow();
     var nextNum = BASE_START;
     if (lastRow >= 1) {
       var lastInternID = sheet
        .getRange(lastRow, internIDColIndex)
        .getDisplayValue();

       if (lastInternID && lastInternID.startsWith("IP-")) {
         var parsed = parseInt(String(lastInternID).split("-")[1], 10);

         if (!isNaN(parsed)) {
          // ✅ critical fix: never go below BASE_START
           nextNum = Math.max(parsed + 1, BASE_START);
         }
      }
    }

    internIdToUse = "IP-" + nextNum;
  }
    
    // --- COMMON STEP: Get/Create Intern-specific folder ---
    var internFolder = getOrCreateInternFolder(parentFolder, internIdToUse);
    // -----------------------------------------------------

    // Helper to save uploaded file into the specific intern folder
    function saveBase64FileToInternFolder(fileObj, prefix, folder) {
      if (!fileObj || !fileObj.data) return "";
      var blob = Utilities.newBlob(
        Utilities.base64Decode(String(fileObj.data)),
        fileObj.mimeType || "application/octet-stream",
        (prefix ? prefix + "_" : "") + internIdToUse + "_" + fileObj.name
      );
      // Create the file directly in the specified folder
      var created = folder.createFile(blob); 
      return created.getUrl();
    }


    // CASE A: existing intern → update row + regenerate appointment letter
    if (isExistingIntern) {

      // 1. Upload new files if provided
      var newPassportLink = formData.passportLink || existingRowData[5];
      if (passportPhoto && passportPhoto[0]) {
        // Pass internFolder explicitly
        newPassportLink = saveBase64FileToInternFolder(passportPhoto[0], "Passport", internFolder);
      }
      var newAadhaarLink = formData.aadhaarLink || existingRowData[6];
      if (aadhaarFile && aadhaarFile[0]) {
        // Pass internFolder explicitly
        newAadhaarLink = saveBase64FileToInternFolder(aadhaarFile[0], "Aadhaar", internFolder);
      }
      var newMarksheetLink = formData.marksheetLink || existingRowData[7];
      if (marksheetFile && marksheetFile[0]) {
        // Pass internFolder explicitly
        newMarkSheetLink = saveBase64FileToInternFolder(marksheetFile[0], "Marksheet", internFolder);
      }

      // 2. Update Sheet Row
      if (existingRowData) {
        var rowValues = existingRowData.slice();

        rowValues[0] = formData.name;
        rowValues[1] = formData.email;
        rowValues[2] = today;
        rowValues[3] = new Date();
        rowValues[4] = existingInternID;
        rowValues[5] = newPassportLink; // New/Old link
        rowValues[6] = newAadhaarLink; 	// New/Old link
        rowValues[7] = newMarksheetLink; // New/Old link

        rowValues[8] 	= formData.motivation;
        rowValues[9] 	= formData.meetingTime;
        rowValues[10] = formData.preEnrol;
        rowValues[11] = formData.enrolProcess;
        rowValues[12] = formData.inductionInfo;
        rowValues[13] = formData.inductionContact;
        rowValues[14] = formData.careerSupport;
        rowValues[15] = formData.expectations;
        rowValues[16] = formData.suggestions;
        rowValues[17] = formData.aadhaarNumber;
        rowValues[18] = formData.consent ? "Yes" : "No";

        // IMPORTANT: We cannot update column T (index 20) yet, because we need the new URL first.
        // The URL will be added after the PDF is generated (Step 3).
        sheet.getRange(existingRowIndex, 1, 1, rowValues.length)
              .setValues([rowValues]);
      }

      // 3. Regenerate Appointment Letter (Delete old one from intern folder first)
      var expectedPdfNameExisting = "Appointment_" + existingInternID + ".pdf";
      // Delete from internFolder
      var oldFiles = internFolder.getFilesByName(expectedPdfNameExisting); 
      while (oldFiles.hasNext()) {
        oldFiles.next().setTrashed(true);
      }

      var updatedName = formData.name || existingName || "Intern";
      
      var pdfResult = generateAppointmentPdfBlob(
        updatedName,
        existingInternID,
        internFolder
      );
      var pdfBase64Existing = Utilities.base64Encode(pdfResult.blob.getBytes());
      // Column T = 20 → Appointment Letter URL
      sheet.getRange(existingRowIndex, 20).setValue(pdfResult.url);
      // ----------------------------


      var msg = "Your updated appointment letter has been generated successfully, and files are in your folder: " + existingInternID + ".";

      return {
        ok: true,
        existing: true,
        message: msg,
        pdf: pdfBase64Existing,
        email: formData.email,
        internId: existingInternID
      };
    }

    // CASE B: new intern (internIdToUse is set to nextInternID)
    
    // 1. Save Files
    // Pass internFolder explicitly
    var passportLink = saveBase64FileToInternFolder(
      passportPhoto && passportPhoto[0],
      "Passport",
      internFolder
    );
    var aadhaarLink = saveBase64FileToInternFolder(
      aadhaarFile && aadhaarFile[0],
      "Aadhaar",
      internFolder
    );
    var marksheetLink = saveBase64FileToInternFolder(
      marksheetFile && marksheetFile[0],
      "Marksheet",
      internFolder
    );

    // 2. Append New Row to Sheet (without the URL yet)
    sheet.appendRow([
      formData.name,
      formData.email,
      today,
      new Date(),
      internIdToUse,
      passportLink,
      aadhaarLink,
      marksheetLink,
      formData.motivation,
      formData.meetingTime,
      formData.preEnrol,
      formData.enrolProcess,
      formData.inductionInfo,
      formData.inductionContact,
      formData.careerSupport,
      formData.expectations,
      formData.suggestions,
      formData.aadhaarNumber,
      formData.consent ? "Yes" : "No"
      // Column 20 (T) will be set in the next step
    ]);

    // 3. Generate Appointment Letter
    var pdfResult = generateAppointmentPdfBlob(
      formData.name,
      internIdToUse,
      internFolder // Pass internFolder here
    );
    var pdfBase64 = Utilities.base64Encode(pdfResult.blob.getBytes());
    // Column T = 20 → Appointment Letter URL. Use getLastRow() as the row was just appended.
    sheet.getRange(sheet.getLastRow(), 20).setValue(pdfResult.url);
    // ----------------------------

    var successMsg = "Congratulations! Your appointment letter has been generated successfully.";

    return {
      ok: true,
      existing: false,
      message: successMsg,
      pdf: pdfBase64,
      email: formData.email,
      internId: internIdToUse
    };
  } catch (err) {
    console && console.error ? console.error(err) : Logger.log(err);
    return { ok: false, message: String(err) };
  }
}

/**
 * Helper: generate appointment letter as PDF blob
 * Also saves the PDF in the given Drive folder with name: Appointment_<InternID>.pdf
 * @param {string} name Intern's name
 * @param {string} internID Intern's ID (used for file name)
 * @param {GoogleAppsScript.Drive.Folder} destinationFolder The folder where the PDF should be saved
 * @param {string} COMPANY_LOGO_URL URL of company logo image
 * @param {string} DIRECTOR_SIGNATURE_URL URL of director signature image
 * @param {string} dateOverride Date string override
 * @returns {{blob: GoogleAppsScript.Base.Blob, url: string}} The PDF blob and its Drive URL.
 */
function generateAppointmentPdfBlob(
  name,
  internID,
  destinationFolder, // Intern's folder
) {
  var today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "dd-MM-yyyy"
  );

  // Creates the temp Google Doc in the root Drive
  const TEMPLATE_ID = "1ALgKbhfwL1_c0m6If3pg1pp2otu7YqH_uf52QDUtcOA"; 
  const copy = DriveApp.getFileById(TEMPLATE_ID)
    .makeCopy("Appointment Letter - " + name, destinationFolder);

  // 2. Open document
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  // 3. Replace placeholders
  body.replaceText("{{NAME}}", name);
  body.replaceText("{{DATE}}", today);
  body.replaceText("{{INTERN_ID}}", internID);

  doc.saveAndClose();

  // 4. PDF convert
  var pdfBlob = DriveApp.getFileById(copy.getId()).getAs("application/pdf");

  // 5. Save PDF
  var pdfFile = destinationFolder.createFile(pdfBlob);
  pdfFile.setName("Appointment_" + internID + ".pdf");

  // 6. Temp doc delete
  copy.setTrashed(true);

  // 7. Return
  return {
    blob: pdfBlob,
    url: pdfFile.getUrl()
  };

  
}

/** OPTIONAL helper you can run once from the Apps Script editor to prompt Drive/Sheet authorization */
function authorizeOnce() {
  var SHEET_URL = "https://docs.google.com/spreadsheets/d/1ZWZYJPh_aNuixayaWr4dM7e0nSULy2hrMj_tf6lH0Ys/edit";
  var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1CKq39MpVU8vKoRqkbCdifvuyLdtV2Rxy?usp=drive_link";
  var folderId = getFolderIdFromUrl(DRIVE_FOLDER_URL);
  if (!folderId) throw new Error("Set DRIVE_FOLDER_URL in authorizeOnce()");
  DriveApp.getFolderById(folderId);
  SpreadsheetApp.openByUrl(SHEET_URL);
  Logger.log("Authorization calls executed. If prompted, grant the requested permissions.");
}