📄 Intern Letter Portal V3

An enhanced and secure web-based system for managing Appointment Letters, Experience Letters, and Feedback Reports for participants of the Global Professional Internship Program.

This version introduces role-based access control, token-based security, and multi-service integration to improve scalability and user experience.

🚀 Key Features
🔐 1. Secure Authentication System
Login using:
Email ID
Mobile Number
Validates against Google Sheets database
Only Active users are allowed
📊 2. Smart Dashboard Access Control

Dynamic UI rendering based on backend response:

✅ Appointment Letter → Always available (with restriction)
✅ Experience Letter → Conditional access
✅ Feedback Report → Conditional access
📄 3. Appointment Letter Control
One-time generation system
Real-time validation using:
checkAppointmentStatus(email)
If already generated:
Modal popup
Direct download option
🎓 4. Experience Letter (Token-Based Security)
Access controlled via secure token system
Token generated using:
Intern ID
Email
Expiry timestamp
Prevents unauthorized access
📝 5. Feedback Report Module (NEW)
Available only if:
User eligible from profile sheet
AND eligible from master sheet
Uses secure token-based URL access
🔍 6. Multi-Sheet Validation System

System integrates with multiple Google Sheets:

Profile Sheet → User authentication
Appointment Sheet → Letter generation status
Master Sheet → Eligibility checks
⚡ 7. Real-Time Backend Validation
Fresh validation on button click
Prevents stale data issues
Ensures data consistency
💬 8. Integrated Support System (NEW)
Floating WhatsApp-style support button
Direct access to IAC support channel
🛠️ Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript
Backend: Google Apps Script
Database: Google Sheets
Security: Token-based authentication (HMAC-SHA256)
Hosting: Google Apps Script Web App
📂 Project Structure
Intern-Letter-Portal-V3/
│
├── index.html        # UI + Client-side logic
├── code.gs           # Backend logic (Apps Script)
├── README.md         # Documentation
🔄 System Workflow
User logs in (Email + Mobile)
Backend validates:
Profile Sheet (authentication)
Status = Active
System checks:
Appointment already generated?
Experience eligibility?
Feedback eligibility?
Dashboard displays dynamic options
User actions:
Appointment → Checked in real-time
Experience → Token-secured redirect
Feedback → Token-secured redirect
🔐 Security Architecture
Token Generation Logic
Uses:
Intern ID
Email
Expiry Time
Signed using:
HMAC-SHA256
Benefits:
Prevents URL manipulation
Time-bound access
Secure data flow between apps
📌 Key Backend Functions
validateLogin(email, password)
Authenticates user
Returns access permissions
Generates tokens
checkAppointmentStatus(email)
Real-time appointment verification
Prevents duplicate generation
checkFeedbackEligibility(internId)
Validates feedback access from master sheet
_findAppointmentUrlForEmail(email)
Fetches existing appointment PDF
🎨 UI Improvements (V3 vs V2)
✅ Dynamic button visibility (Experience & Feedback)
✅ Floating support chat button
✅ Better access control UX
✅ Improved error handling
✅ Token-based redirection
⚠️ Important Constraints
Appointment Letter:
Can be generated only once
Experience & Feedback:
Access depends on eligibility
Tokens:
Time-limited (security enforced)
📧 Support
Email: member@industryacademiacommunity.com
Chat: https://tinyurl.com/5f4bjhwd
WhatsApp Channel integrated in UI
🏢 Organization

Developed for:

Cloud Counselage Pvt. Ltd.

📈 Future Enhancements
Admin dashboard for monitoring
Token refresh mechanism
Audit logs for user actions
Role-based permissions (Admin / Intern)
Analytics dashboard

👨‍💻 Author
Rashid Patel
AI/ML Intern | Developer

Team:
Suraj Mane, Makarand Jena, Vinith Christopher