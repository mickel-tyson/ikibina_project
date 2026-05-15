# Ikibina Guardian - Enhanced Management System

A comprehensive, modern, and secure community savings groups management system that digitizes traditional Ikibina groups while improving transparency, accountability, and financial growth.

## 🚀 Features

### Core System
- **Role-Based Access Control (RBAC)** with 3 distinct dashboards
- **Smart Draw System** - Fair, transparent random selection
- **Audit Logging** - Every action tracked with date, time, user, group
- **Real-time Notifications** - Keep members informed
- **Mobile-Responsive Design** - Works on all devices
- **Modern UI/UX** - Beautiful, intuitive interface

### Authentication System
- Secure login with JWT tokens
- Forgot password functionality
- Password reset via email
- Change password feature
- Session management
- Remember me option
- Role-based redirects

### Admin Dashboard (Full System Control)
- **Dashboard Statistics**: Total groups, active groups, chiefs, members, contributions, loans, defaulters
- **Group Management**: Create, edit, delete, activate/deactivate groups
- **Chief Management**: Register, edit, replace, suspend chiefs
- **Member Management**: Register, edit, transfer, suspend members
- **Financial Oversight**: Monitor contributions, unpaid members, export reports
- **Loan Management**: Final approval, interest rates, repayment tracking
- **Reports**: Weekly, monthly, yearly, financial summaries
- **Audit Logs**: Complete system activity tracking

### Chief Dashboard (Group Management Only)
- **Dashboard Stats**: Total members, paid/unpaid cycles, attendance rate, upcoming draws
- **Member Management**: Add, edit, remove members, view profiles
- **Contributions**: Record payments, confirm receipts, track pending payments
- **Attendance System**: Mark present/absent/late, automatic fines
- **Smart Draw System**: Random fair selection, eligibility filters, draw history
- **Loan Management**: Receive applications, recommend approval/rejection
- **Notifications**: Send meeting reminders, payment reminders, draw announcements
- **Meetings**: Schedule meetings, take notes, group reports

### Member Dashboard (Personal Access Only)
- **Personal Profile**: View and edit personal information
- **Group Information**: Group name, contribution amount, draw schedule
- **Contribution History**: Paid history, missed payments, receipt downloads
- **Attendance History**: Present/absent/late records, fines owed
- **Smart Draw Area**: View assigned number, draw dates, eligibility status
- **Loans**: Apply for loans, view history, repayment schedule
- **Notifications**: Receive payment reminders, meeting alerts, winner announcements

### Public Transparency Page
- Public statistics view (no private data)
- Number of registered groups by district
- Total active groups and members
- Total money circulated
- Success stories
- Top performing sectors
- Growth charts and analytics

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, session management
- **UI/UX**: Modern gradient design, responsive layout

## 📊 Database Schema

### Core Tables
1. **users** - Admin, Chief, Member accounts
2. **groups_table** - Group information and settings
3. **memberships** - Member-to-group relationships
4. **contributions** - Payment records
5. **attendance** - Meeting attendance tracking
6. **draws** - Smart draw results
7. **loans** - Loan applications and tracking
8. **fines** - Attendance and other fines
9. **notifications** - System notifications
10. **audit_logs** - Complete activity tracking

## 🔐 Security Features

- **RBAC Permissions**: Strict role-based access control
- **Encrypted Passwords**: bcrypt hashing
- **Audit Logging**: Every action tracked
- **Anti-Duplicate Payments**: Prevent double payments
- **Fraud Detection**: Suspicious activity alerts
- **Session Management**: Secure session handling
- **JWT Authentication**: Secure token-based auth

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ikibina-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   ```bash
   # Run the database setup script
   node setup_ikibina_db.js
   ```

5. **Start the server**
   ```bash
   node server-enhanced.js
   ```

6. **Access the application**
   - Open browser to: `http://localhost:3000`
   - Public page: `http://localhost:3000/public`

## 👤 Default Accounts

After setup, these demo accounts are available:

- **Admin**: `admin@ikibina.com` / `123456`
- **Chief**: `chief@ikibina.com` / `123456`
- **Member**: `alice@ikibina.com` / `123456`

## 📱 System Features Deep Dive

### Smart Draw System
The revolutionary Smart Draw replaces traditional voting with:
- **Random Selection**: Fair, unbiased winner selection
- **Eligibility Filters**: Must be current on contributions, not already won this cycle
- **Transparency**: Full draw history with winner details
- **Instant Results**: Winner displayed immediately after draw
- **Fairness**: Every eligible member has equal chance

### Attendance & Fines
- **Meeting Management**: Schedule and track meetings
- **Attendance Tracking**: Mark present, absent, or late
- **Automatic Fines**: System calculates fines for absence/lateness
- **Fine Management**: Track and collect fines

### Loan Management
- **Applications**: Members apply for loans with reasons
- **Chief Review**: Chiefs recommend approval/rejection
- **Admin Approval**: Final approval by administrators
- **Repayment Tracking**: Monitor loan repayments
- **Defaulters Report**: Track and manage defaulters

### Notification System
- **Meeting Reminders**: Automatic meeting notifications
- **Payment Reminders**: Alert members about upcoming payments
- **Draw Announcements**: Notify about draw results
- **Loan Updates**: Keep members informed about loan status

## 📊 Reports & Analytics

### Admin Reports
- **Weekly Reports**: Weekly group performance
- **Monthly Reports**: Monthly financial summaries
- **Yearly Reports**: Annual system performance
- **Financial Reports**: Contribution and loan summaries
- **Attendance Reports**: Meeting attendance analytics
- **Loan Reports**: Loan performance and defaulters
- **Group Rankings**: Performance comparison

### Public Analytics
- **District Performance**: Groups by district
- **Growth Charts**: System growth over time
- **Success Stories**: Highlight successful groups
- **Top Sectors**: Best performing areas

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Forgot password

### Admin APIs
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/groups` - All groups
- `POST /api/admin/groups` - Create group
- `GET /api/admin/chiefs` - All chiefs
- `GET /api/admin/members` - All members

### Chief APIs
- `GET /api/chief/my-group` - Chief's assigned group
- `GET /api/chief/members` - Group members
- `POST /api/chief/start-draw` - Start smart draw
- `POST /api/chief/mark-attendance` - Mark attendance

### Member APIs
- `GET /api/member/profile` - Member profile
- `GET /api/member/contributions` - Contribution history
- `GET /api/member/loans` - Loan history
- `POST /api/member/loans` - Apply for loan

### Public APIs
- `GET /api/public/stats` - Public statistics

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Theme switching capability
- **Charts & Graphs**: Visual data representation
- **Fast Loading**: Optimized performance
- **Clean Tables**: Organized data display
- **Export Options**: PDF and Excel exports

## 🌍 Geographic Coverage

The system supports Rwanda's administrative structure:
- **District Level**: Major districts (Kigali, Northern, Southern, Eastern, Western)
- **Sector Level**: Within each district
- **Cell Level**: Within each sector
- **Village Level**: Specific village locations

## 📈 Growth Metrics

Track system performance with:
- **Monthly Growth**: New groups and members
- **Financial Growth**: Total contributions and loans
- **Performance Metrics**: Attendance rates, repayment rates
- **User Satisfaction**: Member feedback and ratings

## 🔒 Compliance & Security

- **Data Protection**: Secure data handling
- **Audit Trails**: Complete activity logging
- **Access Control**: Role-based permissions
- **Encryption**: Sensitive data protection
- **Backup System**: Regular data backups

## 🚀 Future Enhancements

Planned features for future releases:
- **Mobile App**: Native iOS and Android applications
- **SMS Integration**: SMS notifications for members without internet
- **Payment Gateway**: Integration with mobile money systems
- **Advanced Analytics**: AI-powered insights and predictions
- **Multi-language Support**: Support for Kinyarwanda and other languages

## 🤝 Support

For support and questions:
- **Email**: info@ikibina.rw
- **Phone**: +250 788 000 000
- **Location**: Kigali, Rwanda

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Ikibina Guardian** - Building transparent and accountable community savings groups across Rwanda.
