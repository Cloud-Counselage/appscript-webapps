**Intern Letter Portal V2**

A web-based portal designed to streamline the generation of Appointment Letters and Experience Letters for participants of the Global Professional Internship Program.

This system ensures secure access, prevents duplicate letter generation, and provides a smooth user experience through a centralized dashboard.

🚀 Features
🔐 Secure Login System
Authentication using Email ID + Mobile Number
Validates against backend (Google Apps Script)
📊 User Dashboard
Personalized welcome message
Access to letter generation options
📄 Appointment Letter Generation
One-time generation restriction
Prevents duplicate submissions
If already generated → download option via modal
🎓 Experience Letter Generation
Accessible after login
Redirects to dedicated generation app
⚠️ Validation & User Guidance
Pre-login instructions
Post-login important notice (non-editable letter warning)
🧩 Dynamic Modal System
Alerts users if appointment letter already exists
Provides direct download option
🌐 External Integrations
Google Apps Script backend
External letter generation apps
🛠️ Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript
Backend: Google Apps Script
Hosting: Google Apps Script Web App / Static Hosting
Integration: Google Sheets (for user validation & tracking)
📂 Project Structure
Intern-Letter-Portal-V2/
│
├── index.html        # Main UI and client-side logic
├── code.gs           # Backend logic (Google Apps Script)
└── README.md         # Project documentation
🔄 Workflow
User enters:
Email ID
Mobile Number
System validates credentials via backend
On successful login:
Dashboard is displayed
User can:
Generate Appointment Letter
Generate Experience Letter
Appointment Logic:
If NOT generated → opens generator
If already generated → shows modal + download option
🔐 Authentication Logic
Uses google.script.run to call backend function:
validateLogin(email, mobile)
Backend verifies data from stored records (typically Google Sheets)
📌 Key Functional Components
1. Login System
Input validation
Backend authentication
Error handling for invalid credentials
2. Appointment Letter Control
Real-time check using:
checkAppointmentStatus(email)
Prevents regeneration
Modal-based UX for existing records
3. Experience Letter Access
Direct redirection via backend-provided link
Fallback URL support
🎨 UI Highlights
Clean card-based layout
Responsive design
Soft gradient background
Modal-based interaction for better UX
Consistent branding with Cloud Counselage
⚠️ Important Constraints
Appointment Letter:
Can be generated only once
Cannot be edited after submission
Requires:
Same credentials used during IAC registration
📧 Support

For any issues:

Email: member@industryacademiacommunity.com
Community Chat: https://tinyurl.com/5f4bjhwd
🏢 Organization

Developed for:

Cloud Counselage Pvt. Ltd.

📈 Future Enhancements
Role-based access (Admin / User)
Letter preview before generation
Download history tracking
Email notification system
Improved analytics dashboard
👨‍💻 Author

Rashid Patel
AI/ML Intern | Developer