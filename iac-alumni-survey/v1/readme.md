# IAC Alumni Survey Web Application

## 📋 Overview
The IAC Alumni Survey is a Google Apps Script-based web app to collect feedback from Industry Academia Community (IAC) alumni.  
It features a dynamic multi-step survey and generates personalized certificates upon completion.

## ✨ Features
- Dynamic survey flow based on user status (Student, Fresher, Employed, Career Break)
- One-question-at-a-time UI with progress tracking
- Real-time validation and smooth user experience
- Auto certificate generation (JPG & PDF)
- Google Sheets integration with categorized storage
- Unique ID and timestamp for each response

## 👤 User Categories
- **Student** – Learning & career preparation  
- **Fresher** – Early career & job search  
- **Employed** – Career growth insights  
- **Career Break** – Transition & freelance feedback  

## 🛠️ Tech Stack
**Frontend:** HTML, CSS, JavaScript, GSAP  
**Backend:** Google Apps Script  
**Libraries:** html2canvas, jsPDF  

## 📊 Data Flow
1. User fills survey  
2. Data collected via JavaScript  
3. Submitted to Apps Script (`submitForm()`)  
4. Badge assigned based on responses  
5. Stored in Google Sheets  
6. Certificate generated and displayed  

## 🚀 Setup Instructions
1. Create a Google Sheet  
2. Upload logos (IAC, Cloud, Signature) to Drive  
3. Open **Apps Script** from Sheet  
4. Add `Code.gs` and `index.html`  
5. Update config URLs:
```javascript
const SPREADSHEET_URL = 'YOUR_URL';
6.Deploy as Web App (Execute as: Me, Access: Anyone)
7.Test form, sheet storage, and certificate download

--- Output
Google Sheets with categorized responses
Certificate (JPG/PDF, high resolution)

## 🚀 Deployment (Without GitHub – Drag & Drop)

You can deploy this project on Netlify without using GitHub by uploading files directly.

### 📦 Step 1: Prepare Project Folder
Ensure your project structure is like:

project-root/
│── index.html
│── style.css
│── script.js
│── netlify/
│ └── functions/
│      └── submit.js
│── netlify.toml
│── readme.md


### 🌐 Step 2: Open Netlify
1. Go to https://app.netlify.com  
2. Login / Sign up  
3. Click **“Add new site” → “Deploy manually”**

### 📤 Step 3: Drag & Drop
- Drag your **entire project folder** (or zip file) into Netlify upload area  
- Netlify will automatically:
  - Upload files
  - Detect `netlify.toml`
  - Deploy serverless functions

### ⚙️ Step 4: Verify Deployment
- Once deployed, Netlify provides a live URL (e.g., `https://your-site.netlify.app`)
- Open the URL and test:
  - Form submission
  - API call to `/api/submit`
  - Certificate generation

### 🔍 Step 5: Check Functions
1. Go to **Site Dashboard → Functions**
2. Confirm `submit` function is listed
3. Check logs if any error occurs