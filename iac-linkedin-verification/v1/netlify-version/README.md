🚀 IAC LinkedIn Certificate Verification App

A web-based system designed to verify LinkedIn posts submitted by interns for IAC Pledge and Industry Training certifications.
The application ensures authenticity, prevents duplicate submissions, and allows users to edit previously submitted responses.

🔗 Live Demo

👉 (Add your Netlify URL here)

📌 Features
✅ LinkedIn Post Verification
Validates LinkedIn post URL format
Checks required hashtags and content rules
Ensures user identity (name match)
🔁 Duplicate Prevention
Prevents duplicate Intern ID, Email, and URLs
Backend validation using Google Sheets
✏️ Edit Existing Submission
Detects existing users via email
Auto-loads previous data
Allows updates without duplication
🧠 Smart Validation System
Real-time frontend + backend checks
Industry training verification support
At least one training required
📊 Google Sheets Integration
Stores verified data securely
Structured row-based storage
Update existing records via row index
⚡ Responsive UI
Clean and modern interface
Loader + success screen
Mobile-friendly design
🛠️ Tech Stack
Frontend
HTML5, CSS3, JavaScript
Fetch API
Backend
Google Apps Script (GAS)
Google Sheets (Database)
Hosting
Netlify (Frontend)
GAS Web App (Backend API)
🏗️ System Architecture
User (Browser)
      ↓
Netlify Frontend (index.html)
      ↓
Fetch API (GET/POST)
      ↓
Google Apps Script (Web App API)
      ↓
Google Sheets (Database)
⚙️ Setup & Deployment
🔹 1. Clone Repository
git clone repo manually
cd iac-linkedin-verification
🔹 2. Setup Google Apps Script
Open Google Apps Script
Add your code.gs
Connect your Google Sheet
🔹 3. Deploy as Web App
Deploy → New Deployment
Type: Web App
Execute as: Me
Access: Anyone

Copy the URL:

https://script.google.com/macros/s/AKfycbw88MSVTG7pi0uheZ_xcQDyA4EKVcMeg1MCT7jBajVFzBurm0ZNjFZMkgGO1iFApss/exec
🔹 4. Update Frontend API

In index.html:

const API_URL = "https://script.google.com/macros/s/AKfycbw88MSVTG7pi0uheZ_xcQDyA4EKVcMeg1MCT7jBajVFzBurm0ZNjFZMkgGO1iFApss/exec";
🔹 5. Deploy on Netlify
Drag & drop project folder OR
Connect GitHub repo
📂 Project Structure
project/
│
├── index.html       # Frontend UI + JS + CSS
└── code.gs          # Google Apps Script backend
🔐 Validation Logic
LinkedIn URL validation
Name matching in URL
Hashtag/content validation
Duplicate detection:
Intern ID
Email
Pledge URL
Industry URL
🔄 Workflow
User enters details
System checks existing submission
User verifies pledge & industry posts
Backend validates duplicates
Data saved / updated in Google Sheets
Success screen displayed
📊 Data Storage Format
Timestamp	Name	Email	Intern ID	Pledge URL	Pledge Content	Industry Trainings
⚠️ Common Issues & Fixes
Issue	Fix
Failed to fetch	Use URLSearchParams instead of JSON
CORS error	Avoid custom headers
Duplicate error in edit mode	Pass rowIndex
Data not updating	Redeploy GAS
🚀 Future Enhancements
📈 Admin dashboard
📊 Analytics & reports
🔔 Email notifications
📱 Progressive Web App (PWA)
👨‍💻 Author

Rashid Patel
AIML Intern | AI/ML Developer

📜 License

This project is developed for academic and internship purposes.