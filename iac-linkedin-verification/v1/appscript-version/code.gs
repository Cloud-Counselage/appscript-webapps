function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("IAC Certificate Verification");
}

/* =========================================================
   VERIFY-TIME DUPLICATE CHECK (OPTION B)
   Called from verifyPledge()
========================================================= */

function checkPledgeDuplicate(pledgeUrl, internId) {

  const sheet = SpreadsheetApp
    .openById("15b9VLK70G84b9GuTUcD5V3mzGAEbyTv-vczi_xIcF2U")
    .getSheetByName("Sheet1");

  const rows = sheet.getDataRange().getValues();

  const cleanIncomingUrl = cleanUrl(pledgeUrl);
  const cleanInternId = String(internId).trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {

    const existingInternId =
      String(rows[i][3] || "").trim().toLowerCase();

    const existingPledgeUrl =
      cleanUrl(String(rows[i][4] || ""));

    // 🔥 Duplicate Intern ID
    if (existingInternId === cleanInternId) {
      return {
        duplicateIntern: true,
        duplicateUrl: false
      };
    }

    // 🔥 Duplicate Pledge URL
    if (existingPledgeUrl &&
        existingPledgeUrl === cleanIncomingUrl) {
      return {
        duplicateIntern: false,
        duplicateUrl: true
      };
    }
  }

  return {
    duplicateIntern: false,
    duplicateUrl: false
  };
}
function checkIndustryDuplicate(industryUrl) {

  const sheet = SpreadsheetApp
    .openById("15b9VLK70G84b9GuTUcD5V3mzGAEbyTv-vczi_xIcF2U")
    .getSheetByName("Sheet1");

  const rows = sheet.getDataRange().getValues();

  const cleanIncomingUrl = cleanUrl(industryUrl);

  // Industry columns start from index 6
  // [0]=date, 1=name, 2=email, 3=internId, 4=pledgeUrl, 5=pledgeContent
  // Industry links from column 6 onward

  for (let i = 1; i < rows.length; i++) {

    for (let col = 6; col < rows[i].length; col++) {

      const existingIndustryUrl = cleanUrl(String(rows[i][col] || ""));

      if (existingIndustryUrl &&
          existingIndustryUrl === cleanIncomingUrl) {

        return { duplicateIndustry: true };
      }
    }
  }

  return { duplicateIndustry: false };
}



/* =========================================================
   FINAL SUBMIT FUNCTION (SECURITY LAYER)
   Always re-check duplicates here
========================================================= */

function submitForm(data) {

  const sheet = SpreadsheetApp
    .openById("15b9VLK70G84b9GuTUcD5V3mzGAEbyTv-vczi_xIcF2U")
    .getSheetByName("Sheet1");

  const rows = sheet.getDataRange().getValues();

  const internId = String(data.internId).trim().toLowerCase();
  const pledgeUrl = cleanUrl(data.pledgeUrl);

  for (let i = 1; i < rows.length; i++) {

    const existingInternId =
      String(rows[i][3] || "").trim().toLowerCase();

    const existingPledgeUrl =
      cleanUrl(String(rows[i][4] || ""));

    // 🔐 Duplicate Intern Protection
    if (existingInternId === internId) {
      throw new Error("This Intern ID has already submitted verification.");
    }

    // 🔐 Duplicate URL Protection
    if (existingPledgeUrl &&
        existingPledgeUrl === pledgeUrl) {
      throw new Error("This Pledge LinkedIn post has already been submitted.");
    }
  }

  // ✅ If all checks pass → Save row
  sheet.appendRow([
    new Date(),
    data.fullName,
    data.email,
    data.internId,
    data.pledgeUrl,
    data.pledgeContent,
    ...data.industryLinks
  ]);

  return "success";
}


/* =========================================================
   HELPER FUNCTION – URL CLEANER
   Removes tracking params like ?utm_source=
========================================================= */

function cleanUrl(url) {
  try {
    return String(url).split("?")[0].trim();
  } catch (e) {
    return url;
  }
}