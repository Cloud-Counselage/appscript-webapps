🚀 IAC LinkedIn Certificate Verification App (Apps Script Version)

A fully serverless web application built using Google Apps Script, designed to verify LinkedIn posts submitted by interns for IAC Pledge and Industry Training certifications.
The system runs entirely within the Google ecosystem and uses Google Sheets as a database.

🔗 Live App

👉 https://script.google.com/macros/s/AKfycbw88MSVTG7pi0uheZ_xcQDyA4EKVcMeg1MCT7jBajVFzBurm0ZNjFZMkgGO1iFApss/exec

📌 Features
✅ LinkedIn Post Verification
Validates LinkedIn post URLs
Checks required hashtags and content
Ensures identity consistency (name matching)
🔁 Duplicate Prevention
Prevents duplicate submissions using:
Email
Intern ID
LinkedIn URLs
✏️ Edit Existing Submission
Detects existing users via email
Auto-loads previous responses
Allows safe updates without duplication
📊 Google Sheets Integration
Acts as the primary database
Stores all verification records
Supports update using row index
⚡ Real-Time Validation
Frontend + backend validation
Instant feedback using google.script.run
🎯 No External Hosting Required
Entire app runs on Apps Script
No Netlify / backend server needed
🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript (within Apps Script HTML Service)
Backend: Google Apps Script (GAS)
Database: Google Sheets
🏗️ System Architecture
User (Browser)
      ↓
Google Apps Script Web App
      ↓
HTML Service (Frontend UI)
      ↓
google.script.run
      ↓
Apps Script Functions (Backend)
      ↓
Google Sheets (Database)
⚙️ Setup & Deployment
🔹 1. Create Apps Script Project
Go to Google Apps Script
Create a new project
Add:
code.gs (backend logic)
index.html (frontend UI)
🔹 2. Connect Google Sheet
Create a Google Sheet
Copy Sheet ID
Add it in code.gs:
SpreadsheetApp.openById("YOUR_SHEET_ID")
🔹 3. Deploy as Web App
Click Deploy → New Deployment
Select Web App
Execute as: Me
Who has access: Anyone

👉 Copy the Web App URL

🔹 4. Run the Application

Open the Web App URL in browser
→ App loads directly from Apps Script

📂 Project Structure
project/
│
├── code.gs        # Backend logic (validation, storage)
├── index.html     # UI + client-side JS + CSS
🔐 Core Backend Functions
doGet() → Loads the UI
submitForm() → Saves new data
updateForm() → Updates existing data
getUserByEmail() → Fetch existing submission
checkPledgeDuplicate() → Prevent duplicate pledge
checkIndustryDuplicate() → Prevent duplicate industry links
cleanUrl() → Normalize URLs
🔄 Workflow
User opens app
Enters email → system checks existing submission
If found → edit option shown
User verifies:
Pledge post
Industry training posts
Backend checks duplicates
Data stored/updated in Google Sheet
Success screen displayed
📊 Data Storage Format
Timestamp	Name	Email	Intern ID	Pledge URL	Pledge Content	Industry Data
⚠️ Common Issues & Fixes
Issue	Fix
Duplicate error during edit	Use rowIndex skip logic
Data not updating	Check updateForm() logic
App not loading	Verify deployment access
Slow response	Optimize sheet read loops
🚀 Advantages of Apps Script Version
✔ No hosting cost
✔ Simple deployment
✔ Tight integration with Google Sheets
✔ Easy maintenance
🔮 Future Enhancements
📊 Admin dashboard
📈 Analytics view
📧 Email confirmation system
🔐 Role-based access
👨‍💻 Author

Rashid Patel
AIML Intern | AI/ML Developer

📜 License

Developed for academic and internship purposes.