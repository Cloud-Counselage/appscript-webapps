// =============================== 
// Personality Based Career Guidance - Backend 
// =============================== 
// --- CONFIGURATION --- 
const SPREADSHEET_ID = "1LqgsFVJAAbSnNWgRudQZMLglWp2IIw1O04ICal7_nSs";
const SHEET_NAME = "Sheet1"; 
// =============================== 
// SERVE WEB APP 
// =============================== 
function doGet(e) { 
  return HtmlService.createHtmlOutputFromFile("Home") 
    .setTitle("Personality Based Career Guidance") 
    .addMetaTag("viewport", "width=device-width, initial-scale=1") 
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); 
} 
// =============================== 
// CAREER ROADMAP TEXT DATA 
// =============================== 
const CAREER_ROADMAP = { 
  Thinker: { 
    title: "Thinker", 
    phase1: "<strong>Phase 1:</strong><br><strong>Degrees:</strong> Humanities, Philosophy, Sciences, Education<br><strong>Activities:</strong> Reading, deep work, research internships<br><strong>Tools:</strong> Academic journals, online certifications", 
    phase2: "<strong>Phase 2:</strong><br><strong>Roles:</strong> Analyst, Research Assistant, Educator, Think Tank Intern<br><strong>Certifications:</strong> Research Methodology, Instructional Design, Ethics", 
    phase3: "<strong>Phase 3:</strong><br><strong>Careers:</strong> Professor, Scientist, Policy Consultant, Ethics Officer, Coach<br><strong>Growth:</strong> Publish, speak at conferences, lead institutional change" 
  }, 
  Leader: { 
    title: "Leader", 
    phase1: "<strong>Phase 1:</strong><br><strong>Degrees:</strong> Law, Public Policy, Defense Studies, Business Admin<br><strong>Activities:</strong> Student leadership, debate, sports, volunteering", 
    phase2: "<strong>Phase 2:</strong><br><strong>Roles:</strong> Team Lead, Police Cadet, Civil Service Aspirant, Project Manager<br><strong>Certifications:</strong> Conflict resolution, Governance, Leadership", 
    phase3: "<strong>Phase 3:</strong><br><strong>Careers:</strong> Bureaucrat, Military Officer, CEO, Politician, NGO Leader<br><strong>Growth:</strong> Lead initiatives, policy reform, public systems" 
  }, 

  Entrepreneur: { 
    title: "Entrepreneur", 
    phase1: "<strong>Phase 1:</strong><br><strong>Degrees:</strong> Business, Finance, Economics, Marketing<br><strong>Activities:</strong> Side hustles, trading, business fests, sales internships", 
    phase2: "<strong>Phase 2:</strong><br><strong>Roles:</strong> Sales Executive, Product Manager, Startup Cofounder, Analyst<br><strong>Certifications:</strong> Entrepreneurship, Digital Marketing, CFA", 
    phase3: "<strong>Phase 3:</strong><br><strong>Careers:</strong> Founder, VC, CMO, Franchise Owner, Social Entrepreneur<br><strong>Growth:</strong> Build businesses, scale teams, impact economy" 
  }, 

  Creator: { 
    title: "Creator", 
    phase1: "<strong>Phase 1:</strong><br><strong>Degrees:</strong> Fine Arts, Design, Performing Arts, ITI, Vocational Courses<br><strong>Activities:</strong> Creative work, gigs, apprenticeships", 
    phase2: "<strong>Phase 2:</strong><br><strong>Roles:</strong> Technician, Illustrator, Event Coordinator, Performer<br><strong>Certifications:</strong> Crafts, Multimedia Tools, Digital Design", 
    phase3: "<strong>Phase 3:</strong><br><strong>Careers:</strong> Designer, Musician, Chef, Production Manager, Skilled Artisan<br><strong>Growth:</strong> Run workshops, build personal brand, freelance" 
  } 
}; 

// =============================== 
// DOMAIN LIST DATA 
// =============================== 
const DOMAIN_DATA = { 
  Thinker: [ 
    "Psychology", "Sociology", "Philosophy", "History", "Economics", 
    "Political Science", "Public Administration", "Education", "Law", 
    "Data Analytics", "Artificial Intelligence", "Machine Learning" 
  ], 
  Leader: [ 
    "Public Administration", "Political Science", "Law", "Project Management", 
    "Operations Management", "Human Resources", "Event Management", "Cyber Security", 
    "Cloud Computing", "DevOps", "IT Operations", "Quality Assurance", 
    "Data Management", "Business Research", "Systems", "Business Analysis" 
  ], 
  Entrepreneur: [ 
    "Entrepreneurship", "Marketing & Sales", "Product Management", "Finance", 
    "Blockchain", "Digital Marketing", "Agentic AI", "Prompt Engineering", 
    "Business Development" 
  ], 
  Creator: [ 
    "Content Writing", "Graphics & Multimedia", "Mass Communication", "Travel & Tourism", 
    "Physical Education", "Home Science", "Game Development", "Generative AI", 
    "Full Stack Development", "Flutter", "Angular", "React JS", "Node.js", 
    "Android Development", "UI/UX", "Web Development", "Java", "Python" 
  ] 
}; 

// =============================== 
// SETUP SHEET HEADERS 
// =============================== 
function setupHeaders(sheet) { 
  if (sheet.getLastRow() === 0) { 
    const baseHeaders = [ 
      "Timestamp", "Full Name", "Email", "Intern ID", 
      "Dominant Combination", "Thinker Score", "Leader Score", 
      "Entrepreneur Score", "Creator Score" 
    ]; 
    const questionHeaders = []; 
    for (let i = 1; i <= 20; i++) questionHeaders.push("Q" + i); 
    const headers = [...baseHeaders, ...questionHeaders]; 
    sheet.appendRow(headers); 
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold"); 
    sheet.setFrozenRows(1); 
  } 
} 
// =============================== 
// PROCESS ASSESSMENT SUBMISSION 
// =============================== 
function processAssessment(formObject) { 
  // 1. CALCULATE SCORES 
  let scores = { Thinker: 0, Leader: 0, Entrepreneur: 0, Creator: 0 }; 
  for (let i = 1; i <= 5; i++) scores.Thinker += parseInt(formObject["q" + i]); 
  for (let i = 6; i <= 10; i++) scores.Leader += parseInt(formObject["q" + i]); 
  for (let i = 11; i <= 15; i++) scores.Entrepreneur += parseInt(formObject["q" + i]); 
  for (let i = 16; i <= 20; i++) scores.Creator += parseInt(formObject["q" + i]); 
  // 2. FIND TOP 2 PERSONALITIES 
  const sorted = Object.entries(scores) 
    .map(([name, score]) => ({ name, score })) 
    .sort((a, b) => b.score - a.score); 
  const dominant1 = sorted[0]; 
  const dominant2 = sorted[1]; 
  const dominantCombination = `${dominant1.name} & ${dominant2.name}`; 
  // 3. SAVE TO SHEET 
  try { 
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME); 
    setupHeaders(sheet); 
    const timestamp = new Date(); 
    const answers = []; 
    for (let i = 1; i <= 20; i++) answers.push(formObject["q" + i]); 
    const newRow = [ 
      timestamp, 
      formObject.candidateName, 
      formObject.candidateEmail, 
      formObject.internId, 
      dominantCombination, 
      scores.Thinker, 
      scores.Leader, 
      scores.Entrepreneur, 
      scores.Creator, 
      ...answers 
    ]; 
    sheet.appendRow(newRow); 
  } catch (e) { 
    Logger.log("Error writing to sheet: " + e.toString()); 
    return { error: "Could not save data. Please check configuration." }; 
  } 
  // 4. RETURN RESULTS TO FRONTEND 
  return { 
    dominantCombination, 
    allScores: scores, 
    recommendations: [ 
      { ...CAREER_ROADMAP[dominant1.name], domains: DOMAIN_DATA[dominant1.name] }, 
      { ...CAREER_ROADMAP[dominant2.name], domains: DOMAIN_DATA[dominant2.name] } 
    ] 
  }; 
} 

 

 