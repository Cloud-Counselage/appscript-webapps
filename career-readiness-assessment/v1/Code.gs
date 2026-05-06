// --- CONFIGURATION --- 
const SPREADSHEET_ID = "1oqwZFFUdHYhPnBgrstZZRVyU7tbcu29EM7YNVPj6_tk"; // IMPORTANT: Replace with your Google Sheet ID 
const SHEET_NAME = "Career Quiz Responses"; 
// -------------------- 
function doGet(e) { 
  return HtmlService.createHtmlOutputFromFile('index') 
    .setTitle("Career Readiness Assessment") 
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); 
} 

function saveData(submissionData) { 
  try { 
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    let sheet = ss.getSheetByName(SHEET_NAME); 
    if (!sheet) { 
      sheet = ss.insertSheet(SHEET_NAME); 
    } 

    if (sheet.getLastRow() === 0) { 
      const headers = [ 
        "Timestamp", "Name", "Email", 
        // Section A 
        "A1: SWOT Analysis", "A2: Career Goals", "A3: Goals (Detail)", "A4: Articulate Skills", "A5: Learning Preference", "A6: Continual Growth Actions", "A7: Alumni Contact", "A8: LinkedIn Activity", 
        // Section B 
        "B1: Communication Abilities", "B2: Active Listening", "B3: Persuasion Skills", "B4: Influencing Skills", "B5: Asks Questions", "B6: Asks for Guidance", 
        // Section C 
        "C1: Integrity/Accountability", "C2: Personal Brand", "C3: Event Prep", "C4: Meeting Consistency", "C5: Task Prioritization", "C6: Exceeds Goals", "C7: Proof-checks Work", "C8: On Time", "C9: Team Resources", "C10: Offers Praise", 
        // Section D 
        "D1: Listens w/o Interrupting", "D2: Manages Conflict", "D3: Team Accountability", "D4: Complements Strengths", "D5: Compromise/Agility", "D6: Collaboration", "D7: Builds Relationships", 
        // Section E 
        "E1: Navigates Tech Change", "E2: Tech for Efficiency", "E3: Identifies Approp. Tech", "E4: Tech for Decision-Making", "E5: Adapts to New Tech", "E6: Tech for Strategic Goals", 
        // Section F 
        "F1: Sound Reasoning", "F2: Gathers/Analyzes Info", "F3: Proactive", "F4: Interprets Data", "F5: Communicates Rationale", "F6: Multi-tasking Ability", 
        // Section H 
        "H1: Inspires Others", "H2: Leverages Feedback", "H3: Innovative Thinking", "H4: Role Model", "H5: Motivates with Trust", "H6: Project Management", 
        // Summary 
        "Final Score (out of 100)", "Feedback Message" 
      ]; 
      sheet.appendRow(headers); 
    } 

    const answers = submissionData.answers; 
    const rowData = [ 
      new Date(), 
      submissionData.name, 
      submissionData.email, 
      // Section A 
      answers.a1, answers.a2, answers.a3, answers.a4, answers.a5, answers.a6, answers.a7, answers.a8, 
      // Section B 
      answers.b1, answers.b2, answers.b3, answers.b4, answers.b5, answers.b6, 
      // Section C 
      answers.c1, answers.c2, answers.c3, answers.c4, answers.c5, answers.c6, answers.c7, answers.c8, answers.c9, answers.c10, 
      // Section D 
      answers.d1, answers.d2, answers.d3, answers.d4, answers.d5, answers.d6, answers.d7, 
      // Section E 
      answers.e1, answers.e2, answers.e3, answers.e4, answers.e5, answers.e6, 
      // Section F 
      answers.f1, answers.f2, answers.f3, answers.f4, answers.f5, answers.f6, 
      // Section H 
      answers.h1, answers.h2, answers.h3, answers.h4, answers.h5, answers.h6, 
      // Summary 
      submissionData.finalScore, 
      submissionData.feedback 
    ]; 
    sheet.appendRow(rowData); 
    return { success: true, message: "Data saved successfully." }; 
  } catch (error) { 
    Logger.log("Error in saveData: " + error.toString() + "\nStack: " + error.stack); 
    return { success: false, message: "Error saving data: " + error.toString() }; 
  } 
} 

 