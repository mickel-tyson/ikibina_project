# Ikibina Guardian - Community Savings Management System

A full-stack web application designed to help community savings groups (ikibina) in villages manage their members, contributions, and loans digitally instead of using paper records.

## Features

### Role-Based Access Control
- **Admin**: Creates and manages Chiefs and oversees all groups
- **Chief**: Creates groups, adds members, records contributions, manages loans
- **Client**: Views their group, contributions, and loan status

### Core Functionality
- User authentication with JWT tokens
- Group management by chiefs
- Contribution tracking and recording
- Loan application and approval system
- Real-time dashboards with statistics
- Responsive web interface

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database with MySQL2 driver
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **EJS** templating engine
- **Bootstrap 5** for responsive design
- **Bootstrap Icons** for icons
- **Chart.js** for data visualization
- **Vanilla JavaScript** for interactions

## Project Structure

```
ikibina-guardian/
│
├── config/
│   └── database.js          # Database connection configuration
│
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── adminController.js   # Admin dashboard logic
│   ├── chiefController.js   # Chief dashboard logic
│   └── clientController.js  # Client dashboard logic
│
├── middleware/
│   └── auth.js              # Authentication and role-based middleware
│
├── models/
│   ├── User.js              # User model and database operations
│   ├── Group.js             # Group model and database operations
│   ├── Contribution.js      # Contribution model and database operations
│   └── Loan.js              # Loan model and database operations
│
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── admin.js             # Admin routes
│   ├── chief.js             # Chief routes
│   └── client.js            # Client routes
│
├── views/
│   ├── partials/
│   │   ├── header.ejs       # Header template
│   │   └── footer.ejs       # Footer template
│   ├── admin/
│   │   └── dashboard.ejs    # Admin dashboard view
│   ├── chief/
│   │   └── dashboard.ejs    # Chief dashboard view
│   ├── client/
│   │   └── dashboard.ejs    # Client dashboard view
│   ├── login.ejs            # Login page
│   └── register.ejs         # Registration page
│
├── public/                  # Static assets (CSS, JS, images)
├── .env                     # Environment variables
├── app.js                   # Express app configuration
├── server.js                # Server startup file
├── package.json             # Dependencies and scripts
├── database_setup.sql       # Complete database setup script
├── create_admin_chief.sql   # SQL queries for creating users
└── README.md                # This file
```

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL database server
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ikibina-guardian
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Option A: Complete Setup (Recommended)
Run the complete database setup script:
```bash
mysql -u root -p < database_setup.sql
```

#### Option B: Manual Setup
1. Create the database:
```sql
CREATE DATABASE ikibina_guardian;
USE ikibina_guardian;
```

2. Create the users table (already exists according to your setup):
```sql
-- Your existing users table structure
```

3. Create additional tables:
```sql
-- Run the table creation commands from database_setup.sql
```

4. Create admin and chief users:
```bash
mysql -u root -p ikibina_guardian < create_admin_chief.sql
```

### 4. Environment Configuration
Create a `.env` file with the following configuration:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ikibina_guardian
JWT_SECRET=your_jwt_secret_key_here_change_in_production
SESSION_SECRET=your_session_secret_here
```

### 5. Start the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 6. Access the Application
Open your browser and navigate to: `http://localhost:3000`

## Default Login Credentials

The setup script creates default users for testing:

### Admin User
- **Email**: admin@ikibina.com
- **Password**: admin123

### Chief User
- **Email**: chief1@ikibina.com
- **Password**: chief123

### Client User
- **Email**: client1@ikibina.com
- **Password**: client123

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Admin Routes
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Get all users
- `POST /api/admin/chiefs` - Create new chief
- `DELETE /api/admin/chiefs/:id` - Delete chief
- `GET /api/admin/groups` - Get all groups
- `GET /api/admin/loans` - Get all loans

### Chief Routes
- `GET /api/chief/dashboard` - Chief dashboard data
- `GET /api/chief/groups` - Get chief's groups
- `POST /api/chief/groups` - Create new group
- `POST /api/chief/groups/:groupId/members` - Add member to group
- `DELETE /api/chief/groups/:groupId/members/:userId` - Remove member
- `POST /api/chief/groups/:groupId/contributions` - Record contribution
- `GET /api/chief/groups/:groupId/contributions` - Get group contributions
- `POST /api/chief/groups/:groupId/loans` - Issue loan
- `GET /api/chief/groups/:groupId/loans` - Get group loans
- `PUT /api/chief/loans/:loanId/status` - Update loan status

### Client Routes
- `GET /api/client/dashboard` - Client dashboard data
- `GET /api/client/contributions` - Get client contributions
- `GET /api/client/loans` - Get client loans
- `GET /api/client/groups` - Get client groups
- `POST /api/client/loans/request` - Request new loan

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'chief', 'client') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Groups Table
```sql
CREATE TABLE groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    chief_id INT NOT NULL,
    village VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chief_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Additional Tables
- `group_members` - Many-to-many relationship between groups and users
- `contributions` - Track member contributions
- `loans` - Track loan applications and status
- `loan_repayments` - Track loan repayments
- `notifications` - System notifications

## Features in Detail

### Admin Dashboard
- Overview statistics (users, groups, loans)
- User management (create chiefs, view all users)
- Group oversight
- Loan monitoring
- Chief management

### Chief Dashboard
- Group creation and management
- Member management (add/remove members)
- Contribution recording
- Loan issuance and approval
- Group statistics

### Client Dashboard
- View personal contributions
- Track loan status
- View group information
- Request new loans
- Personal statistics

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcryptjs
- Input validation and sanitization
- SQL injection prevention with prepared statements
- Session management

## Responsive Design

The application features a modern, responsive design that works on:
- Desktop computers
- Tablets
- Mobile devices

## Development

### Adding New Features
1. Create/update models in the `models/` directory
2. Add controllers in the `controllers/` directory
3. Define routes in the `routes/` directory
4. Update views in the `views/` directory
5. Test the functionality

### Database Changes
1. Create SQL migration scripts
2. Update the relevant model files
3. Test the changes

## Production Deployment

### Environment Setup
1. Set production environment variables
2. Configure production database
3. Set up reverse proxy (nginx/Apache)
4. Configure SSL certificates
5. Set up process manager (PM2)

### Security Considerations
1. Change default passwords
2. Use strong JWT secrets
3. Enable HTTPS
4. Configure firewall rules
5. Regular database backups

## Support

For issues and questions:
1. Check the documentation
2. Review the database setup scripts
3. Verify environment configuration
4. Check application logs

## License

This project is licensed under the MIT License.

---

**Note**: This application is designed specifically for community savings groups in Rwandan villages (ikibina) and includes features tailored to their specific needs and workflows.
