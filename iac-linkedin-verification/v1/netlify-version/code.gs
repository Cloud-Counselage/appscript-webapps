function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("IAC Certificate Verification");
}

const SPREADSHEET_ID = "15b9VLK70G84b9GuTUcD5V3mzGAEbyTv-vczi_xIcF2U";
const SHEET_NAME = "Sheet1";
const INDUSTRY_COUNT = 8;

function getSheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function normalizeText_(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanUrl(url) {
  try {
    return String(url || "").split("?")[0].trim();
  } catch (e) {
    return String(url || "").trim();
  }
}

function ensureColumns_(sheet, requiredCols) {
  const currentCols = sheet.getMaxColumns();
  if (currentCols < requiredCols) {
    sheet.insertColumnsAfter(currentCols, requiredCols - currentCols);
  }
}

function rowToSubmission_(row, rowIndex) {
  const industryLinks = [];
  const industryContents = [];

  for (let i = 6; i < row.length; i += 2) {
    industryLinks.push(String(row[i] || "").trim());
    industryContents.push(String(row[i + 1] || "").trim());
  }

  while (industryLinks.length < INDUSTRY_COUNT) industryLinks.push("");
  while (industryContents.length < INDUSTRY_COUNT) industryContents.push("");

  return {
    rowIndex,
    fullName: String(row[1] || ""),
    email: String(row[2] || ""),
    internId: String(row[3] || ""),
    pledgeUrl: String(row[4] || ""),
    pledgeContent: String(row[5] || ""),
    industryLinks,
    industryContents
  };
}

function setupHeaders_() {
  const sheet = getSheet_();
  const headers = [
    "Date",
    "Full Name",
    "Email",
    "Intern ID",
    "Pledge URL",
    "Pledge Content"
  ];

  for (let i = 1; i <= INDUSTRY_COUNT; i++) {
    headers.push(`Industry ${i} URL`);
    headers.push(`Industry ${i} Content`);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every(cell => !cell);

  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#273755");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");

    sheet.setFrozenRows(1);
  }
}

function checkPledgeDuplicate(pledgeUrl, internId, currentRowIndex) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();

  const cleanIncomingUrl = cleanUrl(pledgeUrl);
  const cleanIncomingInternId = normalizeText_(internId);
  const skipRow = Number(currentRowIndex) || 0;

  for (let i = 1; i < rows.length; i++) {
    const sheetRowIndex = i + 1;
    if (skipRow && sheetRowIndex === skipRow) continue;

    const existingInternId = normalizeText_(rows[i][3]);
    const existingPledgeUrl = cleanUrl(rows[i][4]);

    if (existingInternId && existingInternId === cleanIncomingInternId) {
      return { duplicateIntern: true, duplicateUrl: false };
    }

    if (existingPledgeUrl && existingPledgeUrl === cleanIncomingUrl) {
      return { duplicateIntern: false, duplicateUrl: true };
    }
  }

  return { duplicateIntern: false, duplicateUrl: false };
}

function checkIndustryDuplicate(industryUrl, currentRowIndex) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();

  const cleanIncomingUrl = cleanUrl(industryUrl);
  const skipRow = Number(currentRowIndex) || 0;

  if (!cleanIncomingUrl) {
    return { duplicateIndustry: false };
  }

  for (let i = 1; i < rows.length; i++) {
    const sheetRowIndex = i + 1;
    if (skipRow && sheetRowIndex === skipRow) continue;

    for (let col = 6; col < rows[i].length; col += 2) {
      const existingIndustryUrl = cleanUrl(rows[i][col]);
      if (existingIndustryUrl && existingIndustryUrl === cleanIncomingUrl) {
        return { duplicateIndustry: true };
      }
    }
  }

  return { duplicateIndustry: false };
}

function submitForm(data) {
  const sheet = getSheet_();
  setupHeaders_();

  const requiredCols = 6 + (INDUSTRY_COUNT * 2);
  ensureColumns_(sheet, requiredCols);

  const rows = sheet.getDataRange().getValues();

  const currentRowIndex = Number(data.rowIndex) || 0;
  const internId = normalizeText_(data.internId);
  const email = normalizeText_(data.email);
  const pledgeUrl = cleanUrl(data.pledgeUrl);

  const industryLinks = Array.isArray(data.industryLinks) ? data.industryLinks : [];
  const industryContents = Array.isArray(data.industryContents) ? data.industryContents : [];

  const submittedIndustryUrls = industryLinks.map(u => cleanUrl(u)).filter(Boolean);

  for (let i = 1; i < rows.length; i++) {
    const sheetRowIndex = i + 1;
    if (currentRowIndex && sheetRowIndex === currentRowIndex) continue;

    const existingInternId = normalizeText_(rows[i][3]);
    const existingEmail = normalizeText_(rows[i][2]);
    const existingPledgeUrl = cleanUrl(rows[i][4]);

    if (existingInternId && existingInternId === internId) {
      throw new Error("This Intern ID has already submitted verification.");
    }

    if (existingEmail && existingEmail === email) {
      throw new Error("This email has already submitted verification.");
    }

    if (existingPledgeUrl && existingPledgeUrl === pledgeUrl) {
      throw new Error("This Pledge LinkedIn post has already been submitted.");
    }

    for (let col = 6; col < rows[i].length; col += 2) {
      const existingIndustryUrl = cleanUrl(rows[i][col]);
      if (existingIndustryUrl && submittedIndustryUrls.includes(existingIndustryUrl)) {
        throw new Error("One of the Industry Training LinkedIn posts has already been submitted.");
      }
    }
  }

  const row = [
    new Date(),
    data.fullName,
    data.email,
    data.internId,
    data.pledgeUrl,
    data.pledgeContent
  ];

  for (let i = 0; i < INDUSTRY_COUNT; i++) {
    row.push(industryLinks[i] || "");
    row.push(industryContents[i] || "");
  }

  while (row.length < requiredCols) row.push("");

  if (currentRowIndex) {
    sheet.getRange(currentRowIndex, 1, 1, requiredCols).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return "success";
}

function getSubmissionByEmail(email) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  const targetEmail = normalizeText_(email);

  if (!targetEmail) {
    return { found: false };
  }

  for (let i = rows.length - 1; i >= 1; i--) {
    const rowEmail = normalizeText_(rows[i][2]);
    if (rowEmail === targetEmail) {
      return {
        found: true,
        data: rowToSubmission_(rows[i], i + 1)
      };
    }
  }

  return { found: false };
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const action = body.action;

    let result;

    switch (action) {
      case "checkPledgeDuplicate":
        result = checkPledgeDuplicate(
          body.pledgeUrl,
          body.internId,
          body.currentRowIndex
        );
        break;

      case "checkIndustryDuplicate":
        result = checkIndustryDuplicate(
          body.industryUrl,
          body.currentRowIndex
        );
        break;

      case "getSubmissionByEmail":
        result = getSubmissionByEmail(body.email);
        break;

      case "submitForm":
        result = submitForm(body.data);
        break;

      default:
        throw new Error("Unknown action: " + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}