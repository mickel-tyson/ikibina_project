const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Database connection
const mysql = require('mysql2/promise');
let pool;

async function initDatabase() {
    try {
        console.log('🔄 Initializing database connection...');
        
        // Connect to MySQL
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ikibina_system',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true
        });
        
        // Test connection
        const [result] = await pool.execute('SELECT 1');
        console.log('✅ Connected to MySQL database');
        
        // Create tables if they don't exist
        await createTables();
        
        // Insert demo data if needed
        await insertDemoData();
        
        console.log('✅ Database setup complete');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        // Try to create database if it doesn't exist
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('🔄 Creating database...');
            try {
                const tempPool = mysql.createPool({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    waitForConnections: true,
                    connectionLimit: 1,
                    queueLimit: 0
                });
                
                await tempPool.execute('CREATE DATABASE ikibina_system');
                await tempPool.end();
                
                // Retry connection
                return initDatabase();
            } catch (createError) {
                console.error('❌ Failed to create database:', createError.message);
            }
        }
        
        console.log('🔄 Continuing without database...');
        pool = null;
    }
}

async function createTables() {
    try {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(150) UNIQUE,
                phone VARCHAR(30) UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin','chief','member') NOT NULL,
                status ENUM('active','inactive','suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS groups_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_name VARCHAR(150) NOT NULL,
                group_code VARCHAR(50) UNIQUE NOT NULL,
                district VARCHAR(100),
                sector VARCHAR(100),
                cell_name VARCHAR(100),
                village VARCHAR(100),
                contribution_amount DECIMAL(12,2) DEFAULT 0,
                frequency ENUM('weekly','monthly') DEFAULT 'weekly',
                draw_day VARCHAR(50),
                draw_type ENUM('yes_no','numbers','rotation') DEFAULT 'yes_no',
                status ENUM('active','inactive') DEFAULT 'active',
                chief_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                member_number INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_group (user_id, group_id)
            )`,
            `CREATE TABLE IF NOT EXISTS contributions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_cycle VARCHAR(100),
                payment_status ENUM('paid','pending','missed') DEFAULT 'paid',
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_method VARCHAR(50),
                receipt_number VARCHAR(100)
            )`,
            `CREATE TABLE IF NOT EXISTS loans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                interest_rate DECIMAL(5,2) DEFAULT 10.00,
                term_months INT DEFAULT 12,
                purpose VARCHAR(255),
                status ENUM('pending','approved','rejected','paid','defaulted') DEFAULT 'pending',
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP NULL,
                approved_by INT NULL,
                due_date TIMESTAMP NULL,
                monthly_payment DECIMAL(12,2)
            )`,
            `CREATE TABLE IF NOT EXISTS loan_repayments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                loan_id INT NOT NULL,
                user_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_method VARCHAR(50),
                balance_remaining DECIMAL(12,2)
            )`,
            `CREATE TABLE IF NOT EXISTS meetings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                meeting_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                meeting_type VARCHAR(100),
                agenda TEXT,
                minutes TEXT,
                status ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled'
            )`,
            `CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                meeting_id INT NOT NULL,
                user_id INT NOT NULL,
                attendance_status ENUM('present','absent','excused') DEFAULT 'present',
                fine_amount DECIMAL(10,2) DEFAULT 0,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS fines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                fine_type ENUM('late_payment','absence','violation') DEFAULT 'late_payment',
                amount DECIMAL(10,2) NOT NULL,
                reason VARCHAR(255),
                status ENUM('pending','paid','waived') DEFAULT 'pending',
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP NULL
            )`,
            `CREATE TABLE IF NOT EXISTS voting_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                session_name VARCHAR(255),
                voting_type ENUM('contribution','loan','other') DEFAULT 'contribution',
                voting_method ENUM('yes_no','numbers') DEFAULT 'yes_no',
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP NULL,
                status ENUM('active','completed','cancelled') DEFAULT 'active'
            )`,
            `CREATE TABLE IF NOT EXISTS votes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                voting_session_id INT NOT NULL,
                user_id INT NOT NULL,
                vote_value VARCHAR(50),
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_session (user_id, voting_session_id)
            )`,
            `CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255),
                message TEXT,
                type ENUM('payment','meeting','loan','general') DEFAULT 'general',
                status ENUM('read','unread') DEFAULT 'unread',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NULL,
                report_type ENUM('weekly','monthly','yearly','financial','loan','contribution','activity') DEFAULT 'weekly',
                report_data JSON,
                report_date DATE,
                generated_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                group_id INT NULL,
                action_done VARCHAR(255),
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE,
                setting_value TEXT,
                description TEXT,
                updated_by INT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS credit_references (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                previous_group_id INT NULL,
                loan_amount DECIMAL(12,2),
                loan_status ENUM('paid','pending','defaulted'),
                payment_history JSON,
                credit_score INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        for (const table of tables) {
            await pool.execute(table);
        }
        
        // Insert default system settings
        await insertDefaultSettings();
        
        console.log('✅ Database tables created/verified');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

async function insertDefaultSettings() {
    try {
        const defaultSettings = [
            ['loan_interest_rate', '10', 'Default loan interest rate (%)'],
            ['late_payment_fine', '500', 'Fine amount for late payments (RWF)'],
            ['absence_fine', '1000', 'Fine amount for meeting absence (RWF)'],
            ['max_loan_amount', '50000', 'Maximum loan amount (RWF)'],
            ['min_members_for_loan', '3', 'Minimum members required for loan approval'],
            ['contribution_reminder_days', '3', 'Days before contribution due date to send reminder'],
            ['email_notifications', 'true', 'Enable email notifications'],
            ['sms_notifications', 'false', 'Enable SMS notifications']
        ];
        
        for (const [key, value, description] of defaultSettings) {
            await pool.execute(
                'INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
                [key, value, description]
            );
        }
    } catch (error) {
        console.error('Error inserting default settings:', error.message);
    }
}

async function insertDemoData() {
    try {
        if (!pool) return;
        
        // Check if admin user exists
        const [adminCheck] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@ikibina.com']);
        if (adminCheck.length === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.execute(
                'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
                ['System Admin', 'admin@ikibina.com', hashedPassword, 'admin']
            );
            
            await pool.execute(
                'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Chief Jean Claude', 'chief@ikibina.com', hashedPassword, 'chief']
            );
            
            await pool.execute(
                'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Alice Member', 'alice@ikibina.com', hashedPassword, 'member']
            );
            
            console.log('✅ Demo users created');
        }
    } catch (error) {
        console.error('❌ Error inserting demo data:', error.message);
    }
}

// Middleware to check authentication (SIMPLE VERSION)
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Please login to access this page' });
    }
    next();
}

// Middleware to log all actions
async function logAction(userId, groupId, action) {
    try {
        if (!pool) return;
        await pool.execute(
            'INSERT INTO audit_logs (user_id, group_id, action_done) VALUES (?, ?, ?)',
            [userId, groupId, action]
        );
    } catch (error) {
        console.error('Audit log error:', error.message);
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('landing', { title: 'Ikibina Guardian - Community Savings Management' });
});

app.get('/login', (req, res) => {
    res.render('login-simple', { title: 'Login - Ikibina Guardian' });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Register - Ikibina Guardian' });
});

// Public transparency page
app.get('/public', async (req, res) => {
    try {
        let stats = {
            totalGroups: 0,
            totalMembers: 0,
            districts: []
        };
        
        if (pool) {
            const [groups] = await pool.execute('SELECT COUNT(*) as total FROM groups_table WHERE status = "active"');
            const [members] = await pool.execute('SELECT COUNT(*) as total FROM memberships');
            const [districts] = await pool.execute('SELECT district, COUNT(*) as count FROM groups_table GROUP BY district');
            
            stats = {
                totalGroups: groups[0].total,
                totalMembers: members[0].total,
                districts: districts
            };
        }
        
        res.render('public', { 
            title: 'Ikibina Guardian - Public Transparency',
            stats: stats
        });
    } catch (error) {
        res.status(500).render('error', { message: 'Server error' });
    }
});

// Authentication routes (SIMPLE VERSION)
app.post('/api/auth/register', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not available. Please try again later.' });
        }
        
        const { full_name, email, phone, password, role } = req.body;
        
        // Validate required fields
        if (!full_name || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required' });
        }
        
        // Check if user already exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, phone, hashedPassword, role || 'member']
        );
        
        await logAction(result.insertId, null, 'User registered');
        
        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: result.insertId,
                full_name,
                email,
                role: role || 'member'
            }
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'User with this email already exists' });
        } else {
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not available. Please try again later.' });
        }
        
        const { email, password } = req.body;
        
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND status = "active"',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Store user in session (NO TOKENS!)
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        };
        
        await logAction(user.id, null, 'User logged in');
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Dashboard routes based on role (SIMPLE VERSION)
app.get('/dashboard', checkAuth, async (req, res) => {
    const role = req.session.user.role;
    
    switch(role) {
        case 'admin':
            res.render('admin/dashboard-simple', { title: 'Admin Dashboard', user: req.session.user });
            break;
        case 'chief':
            res.render('chief/dashboard-simple', { title: 'Chief Dashboard', user: req.session.user });
            break;
        case 'member':
            res.render('member/dashboard-simple', { title: 'Member Dashboard', user: req.session.user });
            break;
        default:
            res.status(403).json({ message: 'Invalid role' });
    }
});

// Direct routes for each role (SIMPLE VERSION)
app.get('/admin', checkAuth, async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('admin/dashboard-simple', { title: 'Admin Dashboard', user: req.session.user });
});

app.get('/chief', checkAuth, async (req, res) => {
    if (req.session.user.role !== 'chief') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('chief/dashboard-simple', { title: 'Chief Dashboard', user: req.session.user });
});

app.get('/member', checkAuth, async (req, res) => {
    if (req.session.user.role !== 'member') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('member/dashboard-simple', { title: 'Member Dashboard', user: req.session.user });
});

// API Routes for Admin (SIMPLE VERSION)
app.get('/api/admin/stats', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({
                totalGroups: 0,
                activeGroups: 0,
                totalChiefs: 0,
                totalMembers: 0,
                totalContributions: 0,
                totalLoans: 0
            });
        }
        
        const [groups] = await pool.execute('SELECT COUNT(*) as total FROM groups_table');
        const [activeGroups] = await pool.execute('SELECT COUNT(*) as total FROM groups_table WHERE status = "active"');
        const [chiefs] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE role = "chief"');
        const [members] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE role = "member"');
        const [contributions] = await pool.execute('SELECT SUM(amount) as total FROM contributions WHERE payment_status = "paid"');
        const [loans] = await pool.execute('SELECT COUNT(*) as total FROM loans WHERE status = "approved"');
        
        res.json({
            totalGroups: groups[0].total,
            activeGroups: activeGroups[0].total,
            totalChiefs: chiefs[0].total,
            totalMembers: members[0].total,
            totalContributions: contributions[0].total || 0,
            totalLoans: loans[0].total
        });
    } catch (error) {
        console.error('Stats error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/groups', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ groups: [] });
        }
        
        const [groups] = await pool.execute(`
            SELECT g.*, u.full_name as chief_name
            FROM groups_table g
            LEFT JOIN users u ON g.chief_id = u.id
            ORDER BY g.created_at DESC
        `);
        
        res.json({ groups });
    } catch (error) {
        console.error('Groups error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/chiefs', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ chiefs: [] });
        }
        
        const [chiefs] = await pool.execute(`
            SELECT u.*, g.group_name
            FROM users u
            LEFT JOIN groups_table g ON u.id = g.chief_id
            WHERE u.role = 'chief'
            ORDER BY u.created_at DESC
        `);
        
        res.json({ chiefs });
    } catch (error) {
        console.error('Chiefs error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/members', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ members: [] });
        }
        
        const [members] = await pool.execute(`
            SELECT u.*, m.member_number, g.group_name
            FROM users u
            LEFT JOIN memberships m ON u.id = m.user_id
            LEFT JOIN groups_table g ON m.group_id = g.id
            WHERE u.role = 'member'
            ORDER BY u.created_at DESC
        `);
        
        res.json({ members });
    } catch (error) {
        console.error('Members error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Group
app.post('/api/admin/groups', checkAuth, async (req, res) => {
    try {
        const { group_name, group_code, district, sector, cell_name, village, contribution_amount, frequency, draw_day } = req.body;
        
        if (!group_name || !group_code) {
            return res.status(400).json({ message: 'Group name and code are required' });
        }
        
        // Generate unique group code if not provided
        const finalGroupCode = group_code || 'GRP' + Date.now();
        
        const [result] = await pool.execute(
            'INSERT INTO groups_table (group_name, group_code, district, sector, cell_name, village, contribution_amount, frequency, draw_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [group_name, finalGroupCode, district, sector, cell_name, village, contribution_amount || 0, frequency || 'weekly', draw_day]
        );
        
        await logAction(req.session.user.id, result.insertId, `Created group: ${group_name}`);
        
        res.status(201).json({
            message: 'Group created successfully',
            group: {
                id: result.insertId,
                group_name,
                group_code: finalGroupCode,
                district,
                sector,
                cell_name,
                village,
                contribution_amount: contribution_amount || 0,
                frequency: frequency || 'weekly',
                draw_day,
                status: 'active'
            }
        });
    } catch (error) {
        console.error('Create group error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'Group code already exists' });
        } else {
            res.status(500).json({ message: 'Server error creating group' });
        }
    }
});

// Update Group
app.put('/api/admin/groups/:id', checkAuth, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { group_name, district, sector, cell_name, village, contribution_amount, frequency, draw_day, chief_id } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE groups_table SET group_name = ?, district = ?, sector = ?, cell_name = ?, village = ?, contribution_amount = ?, frequency = ?, draw_day = ?, chief_id = ? WHERE id = ?',
            [group_name, district, sector, cell_name, village, contribution_amount, frequency, draw_day, chief_id || null, groupId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        await logAction(req.session.user.id, groupId, `Updated group: ${group_name}`);
        
        res.json({ message: 'Group updated successfully' });
    } catch (error) {
        console.error('Update group error:', error.message);
        res.status(500).json({ message: 'Server error updating group' });
    }
});

// Delete Group
app.delete('/api/admin/groups/:id', checkAuth, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        
        const [result] = await pool.execute('DELETE FROM groups_table WHERE id = ?', [groupId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        await logAction(req.session.user.id, groupId, 'Deleted group');
        
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Delete group error:', error.message);
        res.status(500).json({ message: 'Server error deleting group' });
    }
});

// Create User
app.post('/api/admin/users', checkAuth, async (req, res) => {
    try {
        const { full_name, email, phone, password, role } = req.body;
        
        if (!full_name || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required' });
        }
        
        // Check if user already exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User with this email or phone already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, phone, hashedPassword, role || 'member']
        );
        
        await logAction(req.session.user.id, result.insertId, `Created user: ${full_name} (${role})`);
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: result.insertId,
                full_name,
                email,
                phone,
                role: role || 'member'
            }
        });
    } catch (error) {
        console.error('Create user error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'User with this email or phone already exists' });
        } else {
            res.status(500).json({ message: 'Server error creating user' });
        }
    }
});

// Update User
app.put('/api/admin/users/:id', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { full_name, email, phone, role, status } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
            [full_name, email, phone, role, status, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await logAction(req.session.user.id, userId, `Updated user: ${full_name}`);
        
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'Email or phone already exists' });
        } else {
            res.status(500).json({ message: 'Server error updating user' });
        }
    }
});

// Delete User
app.delete('/api/admin/users/:id', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Prevent deleting admin
        const [userCheck] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (userCheck[0].role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete admin user' });
        }
        
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await logAction(req.session.user.id, userId, 'Deleted user');
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error.message);
        res.status(500).json({ message: 'Server error deleting user' });
    }
});

// Get groups by district/sector statistics
app.get('/api/admin/groups-by-location', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ districts: [], sectors: [] });
        }
        
        const [districts] = await pool.execute(`
            SELECT district, COUNT(*) as count, 
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM groups_table 
            WHERE district IS NOT NULL AND district != ''
            GROUP BY district
            ORDER BY count DESC
        `);
        
        const [sectors] = await pool.execute(`
            SELECT sector, COUNT(*) as count,
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM groups_table 
            WHERE sector IS NOT NULL AND sector != ''
            GROUP BY sector
            ORDER BY count DESC
        `);
        
        res.json({ districts, sectors });
    } catch (error) {
        console.error('Groups by location error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get savings per group
app.get('/api/admin/savings-by-group', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ savings: [] });
        }
        
        const [savings] = await pool.execute(`
            SELECT g.group_name, g.group_code, g.district,
                   COUNT(DISTINCT m.user_id) as member_count,
                   COALESCE(SUM(c.amount), 0) as total_savings,
                   COUNT(DISTINCT c.id) as contribution_count
            FROM groups_table g
            LEFT JOIN memberships m ON g.id = m.group_id
            LEFT JOIN contributions c ON m.user_id = c.user_id AND c.payment_status = 'paid'
            WHERE g.status = 'active'
            GROUP BY g.id, g.group_name, g.group_code, g.district
            ORDER BY total_savings DESC
        `);
        
        res.json({ savings });
    } catch (error) {
        console.error('Savings by group error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get loans per group
app.get('/api/admin/loans-by-group', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ loans: [] });
        }
        
        const [loans] = await pool.execute(`
            SELECT g.group_name, g.group_code, g.district,
                   COUNT(l.id) as total_loans,
                   COALESCE(SUM(l.amount), 0) as total_loan_amount,
                   SUM(CASE WHEN l.status = 'approved' THEN 1 ELSE 0 END) as approved_loans,
                   SUM(CASE WHEN l.status = 'paid' THEN 1 ELSE 0 END) as paid_loans,
                   SUM(CASE WHEN l.status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans
            FROM groups_table g
            LEFT JOIN loans l ON g.id = l.group_id
            WHERE g.status = 'active'
            GROUP BY g.id, g.group_name, g.group_code, g.district
            ORDER BY total_loan_amount DESC
        `);
        
        res.json({ loans });
    } catch (error) {
        console.error('Loans by group error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Generate and save reports
app.post('/api/admin/reports', checkAuth, async (req, res) => {
    try {
        const { report_type, group_id, report_data, report_date } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO reports (group_id, report_type, report_data, report_date, generated_by) VALUES (?, ?, ?, ?, ?)',
            [group_id || null, report_type, JSON.stringify(report_data), report_date || new Date().toISOString().split('T')[0], req.session.user.id]
        );
        
        await logAction(req.session.user.id, group_id, `Generated ${report_type} report`);
        
        res.status(201).json({
            message: 'Report generated successfully',
            report_id: result.insertId
        });
    } catch (error) {
        console.error('Generate report error:', error.message);
        res.status(500).json({ message: 'Server error generating report' });
    }
});

// Get reports
app.get('/api/admin/reports', checkAuth, async (req, res) => {
    try {
        const { report_type, group_id, start_date, end_date } = req.query;
        
        let query = 'SELECT r.*, u.full_name as generated_by_name, g.group_name FROM reports r LEFT JOIN users u ON r.generated_by = u.id LEFT JOIN groups_table g ON r.group_id = g.id WHERE 1=1';
        const params = [];
        
        if (report_type) {
            query += ' AND r.report_type = ?';
            params.push(report_type);
        }
        
        if (group_id) {
            query += ' AND r.group_id = ?';
            params.push(group_id);
        }
        
        if (start_date) {
            query += ' AND r.report_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND r.report_date <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY r.created_at DESC';
        
        const [reports] = await pool.execute(query, params);
        
        // Parse JSON data for each report
        const formattedReports = reports.map(report => ({
            ...report,
            report_data: JSON.parse(report.report_data || '{}')
        }));
        
        res.json({ reports: formattedReports });
    } catch (error) {
        console.error('Get reports error:', error.message);
        res.status(500).json({ message: 'Server error fetching reports' });
    }
});

// Get audit logs
app.get('/api/admin/audit-logs', checkAuth, async (req, res) => {
    try {
        const { user_id, group_id, start_date, end_date, limit = 100 } = req.query;
        
        let query = `
            SELECT a.*, u.full_name, u.role, g.group_name 
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            LEFT JOIN groups_table g ON a.group_id = g.id 
            WHERE 1=1
        `;
        const params = [];
        
        if (user_id) {
            query += ' AND a.user_id = ?';
            params.push(user_id);
        }
        
        if (group_id) {
            query += ' AND a.group_id = ?';
            params.push(group_id);
        }
        
        if (start_date) {
            query += ' AND a.log_time >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND a.log_time <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY a.log_time DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [logs] = await pool.execute(query, params);
        
        res.json({ logs });
    } catch (error) {
        console.error('Audit logs error:', error.message);
        res.status(500).json({ message: 'Server error fetching audit logs' });
    }
});

// Get system settings
app.get('/api/admin/settings', checkAuth, async (req, res) => {
    try {
        const [settings] = await pool.execute('SELECT * FROM system_settings ORDER BY setting_key');
        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error.message);
        res.status(500).json({ message: 'Server error fetching settings' });
    }
});

// Update system settings
app.put('/api/admin/settings', checkAuth, async (req, res) => {
    try {
        const { settings } = req.body;
        
        for (const setting of settings) {
            await pool.execute(
                'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
                [setting.value, req.session.user.id, setting.key]
            );
        }
        
        await logAction(req.session.user.id, null, 'Updated system settings');
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error.message);
        res.status(500).json({ message: 'Server error updating settings' });
    }
});

// Get credit reference for user
app.get('/api/admin/credit-reference/:userId', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        const [creditRefs] = await pool.execute(`
            SELECT cr.*, g.group_name as previous_group_name
            FROM credit_references cr
            LEFT JOIN groups_table g ON cr.previous_group_id = g.id
            WHERE cr.user_id = ?
            ORDER BY cr.created_at DESC
        `, [userId]);
        
        res.json({ creditReferences: creditRefs });
    } catch (error) {
        console.error('Credit reference error:', error.message);
        res.status(500).json({ message: 'Server error fetching credit reference' });
    }
});

// Add credit reference
app.post('/api/admin/credit-reference', checkAuth, async (req, res) => {
    try {
        const { user_id, previous_group_id, loan_amount, loan_status, payment_history, credit_score } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO credit_references (user_id, previous_group_id, loan_amount, loan_status, payment_history, credit_score) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, previous_group_id, loan_amount, loan_status, JSON.stringify(payment_history || []), credit_score || 0]
        );
        
        await logAction(req.session.user.id, null, `Added credit reference for user ${user_id}`);
        
        res.status(201).json({
            message: 'Credit reference added successfully',
            credit_reference_id: result.insertId
        });
    } catch (error) {
        console.error('Add credit reference error:', error.message);
        res.status(500).json({ message: 'Server error adding credit reference' });
    }
});

// Get contributions by date range
app.get('/api/admin/contributions', checkAuth, async (req, res) => {
    try {
        const { group_id, start_date, end_date, user_id } = req.query;
        
        let query = `
            SELECT c.*, u.full_name, u.email, g.group_name, g.group_code
            FROM contributions c
            JOIN users u ON c.user_id = u.id
            JOIN groups_table g ON c.group_id = g.id
            WHERE 1=1
        `;
        const params = [];
        
        if (group_id) {
            query += ' AND c.group_id = ?';
            params.push(group_id);
        }
        
        if (user_id) {
            query += ' AND c.user_id = ?';
            params.push(user_id);
        }
        
        if (start_date) {
            query += ' AND c.paid_at >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND c.paid_at <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY c.paid_at DESC';
        
        const [contributions] = await pool.execute(query, params);
        
        res.json({ contributions });
    } catch (error) {
        console.error('Contributions error:', error.message);
        res.status(500).json({ message: 'Server error fetching contributions' });
    }
});

// Get loans with details
app.get('/api/admin/loans', checkAuth, async (req, res) => {
    try {
        const { group_id, status, start_date, end_date } = req.query;
        
        let query = `
            SELECT l.*, u.full_name, u.email, g.group_name, g.group_code,
                   ua.full_name as approved_by_name
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN groups_table g ON l.group_id = g.id
            LEFT JOIN users ua ON l.approved_by = ua.id
            WHERE 1=1
        `;
        const params = [];
        
        if (group_id) {
            query += ' AND l.group_id = ?';
            params.push(group_id);
        }
        
        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }
        
        if (start_date) {
            query += ' AND l.applied_at >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND l.applied_at <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY l.applied_at DESC';
        
        const [loans] = await pool.execute(query, params);
        
        res.json({ loans });
    } catch (error) {
        console.error('Loans error:', error.message);
        res.status(500).json({ message: 'Server error fetching loans' });
    }
});

// API Routes for Chief (SIMPLE VERSION)
app.get('/api/chief/my-group', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not available' });
        }
        
        const [groups] = await pool.execute(
            'SELECT * FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(404).json({ message: 'No group assigned' });
        }
        
        res.json({ group: groups[0] });
    } catch (error) {
        console.error('Chief group error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/chief/members', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ members: [] });
        }
        
        const [members] = await pool.execute(`
            SELECT u.*, m.member_number, m.joined_at
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            WHERE m.group_id = (SELECT id FROM groups_table WHERE chief_id = ?)
            ORDER BY m.member_number
        `, [req.session.user.id]);
        
        res.json({ members });
    } catch (error) {
        console.error('Chief members error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get available users for adding to group (not already in group)
app.get('/api/chief/available-users', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ users: [] });
        }
        
        const [users] = await pool.execute(`
            SELECT u.*
            FROM users u
            WHERE u.role = 'member' 
            AND u.status = 'active'
            AND u.id NOT IN (
                SELECT m.user_id 
                FROM memberships m 
                WHERE m.group_id = (SELECT id FROM groups_table WHERE chief_id = ?)
            )
            ORDER BY u.full_name
        `, [req.session.user.id]);
        
        res.json({ users });
    } catch (error) {
        console.error('Available users error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add member to group
app.post('/api/chief/add-member', checkAuth, async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        // Get next member number
        const [maxNumber] = await pool.execute(
            'SELECT MAX(member_number) as max_num FROM memberships WHERE group_id = ?',
            [groupId]
        );
        
        const nextMemberNumber = (maxNumber[0].max_num || 0) + 1;
        
        // Add member to group
        const [result] = await pool.execute(
            'INSERT INTO memberships (user_id, group_id, member_number) VALUES (?, ?, ?)',
            [user_id, groupId, nextMemberNumber]
        );
        
        await logAction(req.session.user.id, groupId, `Added member #${nextMemberNumber} to group`);
        
        res.status(201).json({
            message: 'Member added successfully',
            membership: {
                id: result.insertId,
                user_id,
                group_id: groupId,
                member_number: nextMemberNumber
            }
        });
    } catch (error) {
        console.error('Add member error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'User is already a member of this group' });
        } else {
            res.status(500).json({ message: 'Server error adding member' });
        }
    }
});

// Remove member from group
app.delete('/api/chief/remove-member/:userId', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        // Remove member from group
        const [result] = await pool.execute(
            'DELETE FROM memberships WHERE user_id = ? AND group_id = ?',
            [userId, groupId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Member not found in group' });
        }
        
        await logAction(req.session.user.id, groupId, `Removed member from group`);
        
        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error.message);
        res.status(500).json({ message: 'Server error removing member' });
    }
});

// Create voting session
app.post('/api/chief/voting-session', checkAuth, async (req, res) => {
    try {
        const { session_name, voting_type, voting_method } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        const [result] = await pool.execute(
            'INSERT INTO voting_sessions (group_id, session_name, voting_type, voting_method) VALUES (?, ?, ?, ?)',
            [groupId, session_name, voting_type || 'contribution', voting_method || 'yes_no']
        );
        
        await logAction(req.session.user.id, groupId, `Created voting session: ${session_name}`);
        
        res.status(201).json({
            message: 'Voting session created successfully',
            session_id: result.insertId
        });
    } catch (error) {
        console.error('Create voting session error:', error.message);
        res.status(500).json({ message: 'Server error creating voting session' });
    }
});

// Get voting sessions
app.get('/api/chief/voting-sessions', checkAuth, async (req, res) => {
    try {
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.json({ sessions: [] });
        }
        
        const groupId = groups[0].id;
        
        const [sessions] = await pool.execute(`
            SELECT vs.*, COUNT(v.id) as vote_count
            FROM voting_sessions vs
            LEFT JOIN votes v ON vs.id = v.voting_session_id
            WHERE vs.group_id = ?
            GROUP BY vs.id
            ORDER BY vs.created_at DESC
        `, [groupId]);
        
        res.json({ sessions });
    } catch (error) {
        console.error('Get voting sessions error:', error.message);
        res.status(500).json({ message: 'Server error fetching voting sessions' });
    }
});

// Cast vote
app.post('/api/chief/vote', checkAuth, async (req, res) => {
    try {
        const { voting_session_id, vote_value } = req.body;
        
        // Check if user is member of the group
        const [membership] = await pool.execute(`
            SELECT m.group_id FROM memberships m
            JOIN voting_sessions vs ON m.group_id = vs.group_id
            WHERE m.user_id = ? AND vs.id = ?
        `, [req.session.user.id, voting_session_id]);
        
        if (membership.length === 0) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO votes (voting_session_id, user_id, vote_value) VALUES (?, ?, ?)',
            [voting_session_id, req.session.user.id, vote_value]
        );
        
        res.status(201).json({
            message: 'Vote cast successfully',
            vote_id: result.insertId
        });
    } catch (error) {
        console.error('Cast vote error:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'You have already voted in this session' });
        } else {
            res.status(500).json({ message: 'Server error casting vote' });
        }
    }
});

// Get group contributions
app.get('/api/chief/contributions', checkAuth, async (req, res) => {
    try {
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.json({ contributions: [] });
        }
        
        const groupId = groups[0].id;
        
        const [contributions] = await pool.execute(`
            SELECT c.*, u.full_name, u.email
            FROM contributions c
            JOIN users u ON c.user_id = u.id
            WHERE c.group_id = ?
            ORDER BY c.paid_at DESC
        `, [groupId]);
        
        res.json({ contributions });
    } catch (error) {
        console.error('Get contributions error:', error.message);
        res.status(500).json({ message: 'Server error fetching contributions' });
    }
});

// Record contribution
app.post('/api/chief/contribution', checkAuth, async (req, res) => {
    try {
        const { user_id, amount, payment_cycle, payment_method } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id, contribution_amount FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        const expectedAmount = groups[0].contribution_amount;
        
        // Generate receipt number
        const receiptNumber = 'RCP' + Date.now();
        
        const [result] = await pool.execute(
            'INSERT INTO contributions (user_id, group_id, amount, payment_cycle, payment_method, receipt_number, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, groupId, amount || expectedAmount, payment_cycle, payment_method, receiptNumber, 'paid']
        );
        
        await logAction(req.session.user.id, groupId, `Recorded contribution for user ${user_id}`);
        
        res.status(201).json({
            message: 'Contribution recorded successfully',
            contribution_id: result.insertId,
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Record contribution error:', error.message);
        res.status(500).json({ message: 'Server error recording contribution' });
    }
});

// Get group loans
app.get('/api/chief/loans', checkAuth, async (req, res) => {
    try {
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.json({ loans: [] });
        }
        
        const groupId = groups[0].id;
        
        const [loans] = await pool.execute(`
            SELECT l.*, u.full_name, u.email
            FROM loans l
            JOIN users u ON l.user_id = u.id
            WHERE l.group_id = ?
            ORDER BY l.applied_at DESC
        `, [groupId]);
        
        res.json({ loans });
    } catch (error) {
        console.error('Get loans error:', error.message);
        res.status(500).json({ message: 'Server error fetching loans' });
    }
});

// Approve/reject loan
app.put('/api/chief/loan/:loanId', checkAuth, async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        const { status, notes } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        // Update loan
        const [result] = await pool.execute(
            'UPDATE loans SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ? AND group_id = ?',
            [status, req.session.user.id, loanId, groupId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Loan not found' });
        }
        
        await logAction(req.session.user.id, groupId, `${status} loan ${loanId}`);
        
        res.json({ message: `Loan ${status} successfully` });
    } catch (error) {
        console.error('Update loan error:', error.message);
        res.status(500).json({ message: 'Server error updating loan' });
    }
});

// Schedule meeting
app.post('/api/chief/meeting', checkAuth, async (req, res) => {
    try {
        const { meeting_date, meeting_type, agenda } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        const [result] = await pool.execute(
            'INSERT INTO meetings (group_id, meeting_date, meeting_type, agenda) VALUES (?, ?, ?, ?)',
            [groupId, meeting_date, meeting_type, agenda]
        );
        
        await logAction(req.session.user.id, groupId, `Scheduled meeting: ${meeting_type}`);
        
        res.status(201).json({
            message: 'Meeting scheduled successfully',
            meeting_id: result.insertId
        });
    } catch (error) {
        console.error('Schedule meeting error:', error.message);
        res.status(500).json({ message: 'Server error scheduling meeting' });
    }
});

// Get meetings
app.get('/api/chief/meetings', checkAuth, async (req, res) => {
    try {
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.json({ meetings: [] });
        }
        
        const groupId = groups[0].id;
        
        const [meetings] = await pool.execute(
            'SELECT * FROM meetings WHERE group_id = ? ORDER BY meeting_date DESC',
            [groupId]
        );
        
        res.json({ meetings });
    } catch (error) {
        console.error('Get meetings error:', error.message);
        res.status(500).json({ message: 'Server error fetching meetings' });
    }
});

// Record attendance
app.post('/api/chief/attendance', checkAuth, async (req, res) => {
    try {
        const { meeting_id, attendance_records } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute(
            'SELECT id FROM groups_table WHERE chief_id = ?',
            [req.session.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(400).json({ message: 'No group assigned to this chief' });
        }
        
        const groupId = groups[0].id;
        
        // Verify meeting belongs to chief's group
        const [meetingCheck] = await pool.execute(
            'SELECT id FROM meetings WHERE id = ? AND group_id = ?',
            [meeting_id, groupId]
        );
        
        if (meetingCheck.length === 0) {
            return res.status(403).json({ message: 'Meeting not found or access denied' });
        }
        
        // Record attendance for each member
        for (const record of attendance_records) {
            await pool.execute(
                'INSERT INTO attendance (meeting_id, user_id, attendance_status, fine_amount) VALUES (?, ?, ?, ?)',
                [meeting_id, record.user_id, record.attendance_status, record.fine_amount || 0]
            );
        }
        
        await logAction(req.session.user.id, groupId, `Recorded attendance for meeting ${meeting_id}`);
        
        res.json({ message: 'Attendance recorded successfully' });
    } catch (error) {
        console.error('Record attendance error:', error.message);
        res.status(500).json({ message: 'Server error recording attendance' });
    }
});

// API Routes for Member (SIMPLE VERSION)
app.get('/api/member/profile', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ user: req.session.user, membership: null });
        }
        
        const [user] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
        const [membership] = await pool.execute(`
            SELECT m.*, g.group_name, g.contribution_amount, g.frequency, g.draw_day
            FROM memberships m
            JOIN groups_table g ON m.group_id = g.id
            WHERE m.user_id = ?
        `, [req.session.user.id]);
        
        res.json({
            user: user[0],
            membership: membership[0] || null
        });
    } catch (error) {
        console.error('Member profile error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/member/contributions', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ contributions: [] });
        }
        
        const [contributions] = await pool.execute(
            'SELECT c.*, g.group_name, g.group_code FROM contributions c JOIN groups_table g ON c.group_id = g.id WHERE c.user_id = ? ORDER BY c.paid_at DESC',
            [req.session.user.id]
        );
        res.json({ contributions });
    } catch (error) {
        console.error('Member contributions error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get member loans
app.get('/api/member/loans', checkAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ loans: [] });
        }
        
        const [loans] = await pool.execute(`
            SELECT l.*, g.group_name, g.group_code,
                   lr.payment_date as repayment_date, lr.amount as repayment_amount
            FROM loans l
            JOIN groups_table g ON l.group_id = g.id
            LEFT JOIN loan_repayments lr ON l.id = lr.loan_id
            WHERE l.user_id = ?
            ORDER BY l.applied_at DESC
        `, [req.session.user.id]);
        
        res.json({ loans });
    } catch (error) {
        console.error('Member loans error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Apply for loan
app.post('/api/member/loan', checkAuth, async (req, res) => {
    try {
        const { amount, purpose, term_months } = req.body;
        
        // Get member's group
        const [membership] = await pool.execute(
            'SELECT group_id FROM memberships WHERE user_id = ?',
            [req.session.user.id]
        );
        
        if (membership.length === 0) {
            return res.status(400).json({ message: 'You are not a member of any group' });
        }
        
        const groupId = membership[0].group_id;
        
        // Check if user has any outstanding loans
        const [outstandingLoans] = await pool.execute(
            'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN ("pending", "approved")',
            [req.session.user.id]
        );
        
        if (outstandingLoans[0].count > 0) {
            return res.status(400).json({ message: 'You have outstanding loans. Please repay them first.' });
        }
        
        // Get system settings for loan interest
        const [settings] = await pool.execute(
            'SELECT setting_value FROM system_settings WHERE setting_key = "loan_interest_rate"'
        );
        
        const interestRate = settings.length > 0 ? parseFloat(settings[0].setting_value) : 10;
        
        // Calculate monthly payment
        const monthlyInterest = interestRate / 100 / 12;
        const monthlyPayment = amount * monthlyInterest * Math.pow(1 + monthlyInterest, term_months) / (Math.pow(1 + monthlyInterest, term_months) - 1);
        
        const [result] = await pool.execute(
            'INSERT INTO loans (user_id, group_id, amount, interest_rate, term_months, purpose, monthly_payment, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH))',
            [req.session.user.id, groupId, amount, interestRate, term_months || 12, purpose, monthlyPayment, term_months || 12]
        );
        
        await logAction(req.session.user.id, groupId, `Applied for loan: RWF ${amount}`);
        
        res.status(201).json({
            message: 'Loan application submitted successfully',
            loan_id: result.insertId
        });
    } catch (error) {
        console.error('Apply loan error:', error.message);
        res.status(500).json({ message: 'Server error applying for loan' });
    }
});

// Make loan repayment
app.post('/api/member/loan-repayment', checkAuth, async (req, res) => {
    try {
        const { loan_id, amount, payment_method } = req.body;
        
        // Get loan details
        const [loans] = await pool.execute(
            'SELECT * FROM loans WHERE id = ? AND user_id = ? AND status = "approved"',
            [loan_id, req.session.user.id]
        );
        
        if (loans.length === 0) {
            return res.status(404).json({ message: 'Loan not found or not approved' });
        }
        
        const loan = loans[0];
        
        // Calculate remaining balance
        const [repayments] = await pool.execute(
            'SELECT SUM(amount) as total_paid FROM loan_repayments WHERE loan_id = ?',
            [loan_id]
        );
        
        const totalPaid = repayments[0].total_paid || 0;
        const remainingBalance = loan.amount + (loan.amount * loan.interest_rate / 100) - totalPaid;
        
        if (amount > remainingBalance) {
            return res.status(400).json({ message: 'Payment amount exceeds remaining balance' });
        }
        
        // Record repayment
        const [result] = await pool.execute(
            'INSERT INTO loan_repayments (loan_id, user_id, amount, payment_method, balance_remaining) VALUES (?, ?, ?, ?, ?)',
            [loan_id, req.session.user.id, amount, payment_method, remainingBalance - amount]
        );
        
        // Update loan status if fully paid
        if (remainingBalance - amount <= 0) {
            await pool.execute(
                'UPDATE loans SET status = "paid" WHERE id = ?',
                [loan_id]
            );
        }
        
        await logAction(req.session.user.id, loan.group_id, `Made loan repayment: RWF ${amount}`);
        
        res.status(201).json({
            message: 'Repayment recorded successfully',
            repayment_id: result.insertId,
            remaining_balance: remainingBalance - amount
        });
    } catch (error) {
        console.error('Loan repayment error:', error.message);
        res.status(500).json({ message: 'Server error recording repayment' });
    }
});

// Get member notifications
app.get('/api/member/notifications', checkAuth, async (req, res) => {
    try {
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );
        
        res.json({ notifications });
    } catch (error) {
        console.error('Notifications error:', error.message);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
});

// Mark notification as read
app.put('/api/member/notifications/:id', checkAuth, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        
        const [result] = await pool.execute(
            'UPDATE notifications SET status = "read" WHERE id = ? AND user_id = ?',
            [notificationId, req.session.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification error:', error.message);
        res.status(500).json({ message: 'Server error marking notification' });
    }
});

// Get member attendance
app.get('/api/member/attendance', checkAuth, async (req, res) => {
    try {
        const [attendance] = await pool.execute(`
            SELECT a.*, m.meeting_date, m.meeting_type, g.group_name
            FROM attendance a
            JOIN meetings m ON a.meeting_id = m.id
            JOIN groups_table g ON m.group_id = g.id
            WHERE a.user_id = ?
            ORDER BY m.meeting_date DESC
        `, [req.session.user.id]);
        
        res.json({ attendance });
    } catch (error) {
        console.error('Attendance error:', error.message);
        res.status(500).json({ message: 'Server error fetching attendance' });
    }
});

// Get member fines
app.get('/api/member/fines', checkAuth, async (req, res) => {
    try {
        const [fines] = await pool.execute(`
            SELECT f.*, g.group_name
            FROM fines f
            JOIN groups_table g ON f.group_id = g.id
            WHERE f.user_id = ?
            ORDER BY f.issued_at DESC
        `, [req.session.user.id]);
        
        res.json({ fines });
    } catch (error) {
        console.error('Fines error:', error.message);
        res.status(500).json({ message: 'Server error fetching fines' });
    }
});

// Pay fine
app.post('/api/member/fine-payment', checkAuth, async (req, res) => {
    try {
        const { fine_id, payment_method } = req.body;
        
        // Get fine details
        const [fines] = await pool.execute(
            'SELECT * FROM fines WHERE id = ? AND user_id = ? AND status = "pending"',
            [fine_id, req.session.user.id]
        );
        
        if (fines.length === 0) {
            return res.status(404).json({ message: 'Fine not found or already paid' });
        }
        
        const fine = fines[0];
        
        // Mark fine as paid
        await pool.execute(
            'UPDATE fines SET status = "paid", paid_at = NOW() WHERE id = ?',
            [fine_id]
        );
        
        await logAction(req.session.user.id, fine.group_id, `Paid fine: RWF ${fine.amount}`);
        
        res.json({ message: 'Fine paid successfully' });
    } catch (error) {
        console.error('Pay fine error:', error.message);
        res.status(500).json({ message: 'Server error paying fine' });
    }
});

// Get member voting sessions
app.get('/api/member/voting-sessions', checkAuth, async (req, res) => {
    try {
        // Get member's group
        const [membership] = await pool.execute(
            'SELECT group_id FROM memberships WHERE user_id = ?',
            [req.session.user.id]
        );
        
        if (membership.length === 0) {
            return res.json({ sessions: [] });
        }
        
        const groupId = membership[0].group_id;
        
        const [sessions] = await pool.execute(`
            SELECT vs.*, 
                   CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END as has_voted,
                   v.vote_value as user_vote
            FROM voting_sessions vs
            LEFT JOIN votes v ON vs.id = v.voting_session_id AND v.user_id = ?
            WHERE vs.group_id = ? AND vs.status = 'active'
            ORDER BY vs.created_at DESC
        `, [req.session.user.id, groupId]);
        
        res.json({ sessions });
    } catch (error) {
        console.error('Voting sessions error:', error.message);
        res.status(500).json({ message: 'Server error fetching voting sessions' });
    }
});

// Public API Routes
app.get('/api/public/stats', async (req, res) => {
    try {
        let stats = {
            totalGroups: 0,
            totalMembers: 0,
            totalMoney: 0,
            growthRate: 15,
            districts: []
        };
        
        if (pool) {
            const [groups] = await pool.execute('SELECT COUNT(*) as total FROM groups_table WHERE status = "active"');
            const [members] = await pool.execute('SELECT COUNT(*) as total FROM memberships');
            const [contributions] = await pool.execute('SELECT SUM(amount) as total FROM contributions WHERE payment_status = "paid"');
            const [districts] = await pool.execute(`
                SELECT district, COUNT(*) as count, 
                       (SELECT COUNT(*) FROM memberships m JOIN groups_table g ON m.group_id = g.id WHERE g.district = groups_table.district) as members
                FROM groups_table 
                WHERE status = "active" 
                GROUP BY district
            `);
            
            stats = {
                totalGroups: groups[0].total,
                totalMembers: members[0].total,
                totalMoney: contributions[0].total || 0,
                growthRate: 15,
                districts: districts.map(d => ({ ...d, growth: Math.floor(Math.random() * 20) - 5 }))
            };
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Public stats error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
async function startServer() {
    await initDatabase();
    
    app.set('view engine', 'ejs');
    app.listen(PORT, () => {
        console.log(`🚀 Ikibina Guardian Server running on port ${PORT}`);
        console.log(`📱 Visit http://localhost:${PORT} to access the application`);
        console.log(`🔑 Admin: admin@ikibina.com / 123456`);
        console.log(`👑 Chief: chief@ikibina.com / 123456`);
        console.log(`👥 Member: alice@ikibina.com / 123456`);
        console.log(`✅ NO TOKENS - Simple Session Authentication`);
    });
}

startServer().catch(console.error);
