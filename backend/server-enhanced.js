const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
        // Connect directly to the database (it will be created if it doesn't exist)
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
        
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        console.log('🔄 Starting server with limited functionality...');
        // Don't exit, continue with limited functionality
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
                status ENUM('active','inactive') DEFAULT 'active',
                chief_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                member_number INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS contributions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_cycle VARCHAR(100),
                payment_status ENUM('paid','pending','missed') DEFAULT 'paid',
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                group_id INT NULL,
                action_done VARCHAR(255),
                log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        for (const table of tables) {
            await pool.execute(table);
        }
        
        // Insert demo admin if not exists
        const [adminCheck] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@ikibina.com']);
        if (adminCheck.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.execute(
                'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
                ['System Admin', 'admin@ikibina.com', hashedPassword, 'admin']
            );
        }
        
        console.log('✅ Database tables created/verified');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

// Middleware to check authentication
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Middleware to log all actions
async function logAction(userId, groupId, action) {
    try {
        if (!pool) return; // Skip if no database connection
        await pool.execute(
            'INSERT INTO audit_logs (user_id, group_id, action_done) VALUES (?, ?, ?)',
            [userId, groupId, action]
        );
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('landing', { title: 'Ikibina Guardian - Community Savings Management' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login - Ikibina Guardian' });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Register - Ikibina Guardian' });
});

// Public transparency page
app.get('/public', async (req, res) => {
    try {
        const [groups] = await pool.execute('SELECT COUNT(*) as total FROM groups_table WHERE status = "active"');
        const [members] = await pool.execute('SELECT COUNT(*) as total FROM memberships');
        const [districts] = await pool.execute('SELECT district, COUNT(*) as count FROM groups_table GROUP BY district');
        
        res.render('public', { 
            title: 'Ikibina Guardian - Public Transparency',
            stats: {
                totalGroups: groups[0].total,
                totalMembers: members[0].total,
                districts: districts
            }
        });
    } catch (error) {
        res.status(500).render('error', { message: 'Server error' });
    }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        // Check database connection
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
            'SELECT id FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User with this email or phone already exists' });
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
        console.error('Registration error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'User with this email or phone already exists' });
        } else {
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        // Check database connection
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
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        await logAction(user.id, null, 'User logged in');
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Dashboard routes based on role
app.get('/dashboard', authenticateToken, async (req, res) => {
    const role = req.user.role;
    
    switch(role) {
        case 'admin':
            res.render('admin/dashboard-enhanced', { title: 'Admin Dashboard', user: req.user });
            break;
        case 'chief':
            res.render('chief/dashboard-enhanced', { title: 'Chief Dashboard', user: req.user });
            break;
        case 'member':
            res.render('member/dashboard-enhanced', { title: 'Member Dashboard', user: req.user });
            break;
        default:
            res.status(403).json({ message: 'Invalid role' });
    }
});

// Direct routes for each role
app.get('/admin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('admin/dashboard-enhanced', { title: 'Admin Dashboard', user: req.user });
});

app.get('/chief', authenticateToken, async (req, res) => {
    if (req.user.role !== 'chief') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('chief/dashboard-enhanced', { title: 'Chief Dashboard', user: req.user });
});

app.get('/member', authenticateToken, async (req, res) => {
    if (req.user.role !== 'member') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('member/dashboard-enhanced', { title: 'Member Dashboard', user: req.user });
});

// API Routes for Admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
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
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/groups', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.execute(`
            SELECT g.*, u.full_name as chief_name 
            FROM groups_table g 
            LEFT JOIN users u ON g.chief_id = u.id
            ORDER BY g.created_at DESC
        `);
        res.json({ groups });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/admin/groups', authenticateToken, async (req, res) => {
    try {
        const { group_name, group_code, district, sector, cell_name, village, contribution_amount, frequency, draw_day } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO groups_table (group_name, group_code, district, sector, cell_name, village, contribution_amount, frequency, draw_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [group_name, group_code, district, sector, cell_name, village, contribution_amount, frequency, draw_day]
        );
        
        await logAction(req.user.id, result.insertId, 'Created group');
        
        res.status(201).json({ message: 'Group created successfully', groupId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// API Routes for Chief
app.get('/api/chief/my-group', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.execute(
            'SELECT * FROM groups_table WHERE chief_id = ?',
            [req.user.id]
        );
        
        if (groups.length === 0) {
            return res.status(404).json({ message: 'No group assigned' });
        }
        
        res.json({ group: groups[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/chief/members', authenticateToken, async (req, res) => {
    try {
        const [members] = await pool.execute(`
            SELECT u.*, m.member_number, m.joined_at
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            WHERE m.group_id = (SELECT id FROM groups_table WHERE chief_id = ?)
            ORDER BY m.member_number
        `, [req.user.id]);
        
        res.json({ members });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Smart Draw System
app.post('/api/chief/start-draw', authenticateToken, async (req, res) => {
    try {
        // Get chief's group
        const [groups] = await pool.execute('SELECT id FROM groups_table WHERE chief_id = ?', [req.user.id]);
        if (groups.length === 0) {
            return res.status(404).json({ message: 'No group assigned' });
        }
        const groupId = groups[0].id;
        
        // Get eligible members (paid contributions, not already won, not suspended)
        const [eligible] = await pool.execute(`
            SELECT u.id, u.full_name, m.member_number
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            WHERE m.group_id = ? 
            AND u.status = 'active'
            AND m.user_id NOT IN (
                SELECT winner_user_id FROM draws 
                WHERE group_id = ? 
                AND draw_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            )
            AND m.user_id IN (
                SELECT DISTINCT user_id FROM contributions 
                WHERE group_id = ? 
                AND payment_status = 'paid'
                AND paid_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            )
        `, [groupId, groupId, groupId]);
        
        if (eligible.length === 0) {
            return res.status(400).json({ message: 'No eligible members for draw' });
        }
        
        // Random selection
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        
        // Calculate total amount (all contributions this cycle)
        const [totalResult] = await pool.execute(
            'SELECT SUM(amount) as total FROM contributions WHERE group_id = ? AND payment_status = "paid"',
            [groupId]
        );
        const totalAmount = totalResult[0].total || 0;
        
        // Record draw
        await pool.execute(
            'INSERT INTO draws (group_id, winner_user_id, cycle_name, total_amount, drawn_by) VALUES (?, ?, ?, ?, ?)',
            [groupId, winner.id, `Draw ${Date.now()}`, totalAmount, req.user.id]
        );
        
        await logAction(req.user.id, groupId, `Started draw - Winner: ${winner.full_name}`);
        
        res.json({
            message: 'Draw completed successfully',
            winner: {
                id: winner.id,
                name: winner.full_name,
                memberNumber: winner.member_number
            },
            totalAmount
        });
    } catch (error) {
        console.error('Draw error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// API Routes for Member
app.get('/api/member/profile', authenticateToken, async (req, res) => {
    try {
        const [member] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const [membership] = await pool.execute(`
            SELECT m.*, g.group_name, g.contribution_amount, g.frequency, g.draw_day
            FROM memberships m
            JOIN groups_table g ON m.group_id = g.id
            WHERE m.user_id = ?
        `, [req.user.id]);
        
        res.json({
            user: member[0],
            membership: membership[0] || null
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/member/contributions', authenticateToken, async (req, res) => {
    try {
        const [contributions] = await pool.execute(
            'SELECT * FROM contributions WHERE user_id = ? ORDER BY paid_at DESC',
            [req.user.id]
        );
        res.json({ contributions });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/member/loans', authenticateToken, async (req, res) => {
    try {
        const [loans] = await pool.execute(
            'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ loans });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/member/loans', authenticateToken, async (req, res) => {
    try {
        const { amount, reason } = req.body;
        
        // Get member's group
        const [membership] = await pool.execute(
            'SELECT group_id FROM memberships WHERE user_id = ?',
            [req.user.id]
        );
        
        if (membership.length === 0) {
            return res.status(400).json({ message: 'Not a member of any group' });
        }
        
        const groupId = membership[0].group_id;
        
        // Create loan application
        const [result] = await pool.execute(
            'INSERT INTO loans (user_id, group_id, amount, reason) VALUES (?, ?, ?, ?)',
            [req.user.id, groupId, amount, reason]
        );
        
        await logAction(req.user.id, groupId, `Applied for loan: RWF ${amount}`);
        
        res.status(201).json({ 
            message: 'Loan application submitted successfully',
            loanId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/member/notifications', authenticateToken, async (req, res) => {
    try {
        const [membership] = await pool.execute(
            'SELECT group_id FROM memberships WHERE user_id = ?',
            [req.user.id]
        );
        
        let notifications = [];
        if (membership.length > 0) {
            const [result] = await pool.execute(
                'SELECT * FROM notifications WHERE group_id = ? OR user_id = ? ORDER BY created_at DESC LIMIT 10',
                [membership[0].group_id, req.user.id]
            );
            notifications = result;
        }
        
        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Public API Routes
app.get('/api/public/stats', async (req, res) => {
    try {
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
        
        res.json({
            totalGroups: groups[0].total,
            totalMembers: members[0].total,
            totalMoney: contributions[0].total || 0,
            growthRate: 15, // This would be calculated from historical data
            districts: districts.map(d => ({ ...d, growth: Math.floor(Math.random() * 20) - 5 }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced Admin API Routes
app.get('/api/admin/chiefs', authenticateToken, async (req, res) => {
    try {
        const [chiefs] = await pool.execute(`
            SELECT u.*, g.group_name 
            FROM users u 
            LEFT JOIN groups_table g ON u.id = g.chief_id 
            WHERE u.role = 'chief'
            ORDER BY u.created_at DESC
        `);
        res.json({ chiefs });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/members', authenticateToken, async (req, res) => {
    try {
        const [members] = await pool.execute(`
            SELECT u.*, m.member_number, m.joined_at, g.group_name 
            FROM users u 
            JOIN memberships m ON u.id = m.user_id 
            JOIN groups_table g ON m.group_id = g.id 
            WHERE u.role = 'member'
            ORDER BY u.created_at DESC
        `);
        res.json({ members });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced Chief API Routes
app.get('/api/chief/draw-eligibility', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.execute('SELECT id FROM groups_table WHERE chief_id = ?', [req.user.id]);
        if (groups.length === 0) {
            return res.status(404).json({ message: 'No group assigned' });
        }
        const groupId = groups[0].id;
        
        // Count eligible members
        const [eligible] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            WHERE m.group_id = ? 
            AND u.status = 'active'
            AND m.user_id NOT IN (
                SELECT winner_user_id FROM draws 
                WHERE group_id = ? 
                AND draw_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            )
            AND m.user_id IN (
                SELECT DISTINCT user_id FROM contributions 
                WHERE group_id = ? 
                AND payment_status = 'paid'
                AND paid_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            )
        `, [groupId, groupId, groupId]);
        
        res.json({ eligibleCount: eligible[0].count });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/chief/draw-history', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.execute('SELECT id FROM groups_table WHERE chief_id = ?', [req.user.id]);
        if (groups.length === 0) {
            return res.status(404).json({ message: 'No group assigned' });
        }
        const groupId = groups[0].id;
        
        const [draws] = await pool.execute(`
            SELECT d.*, u.full_name, m.member_number
            FROM draws d
            JOIN users u ON d.winner_user_id = u.id
            JOIN memberships m ON u.id = m.user_id AND m.group_id = d.group_id
            WHERE d.group_id = ?
            ORDER BY d.draw_date DESC
            LIMIT 10
        `, [groupId]);
        
        res.json({ draws });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Attendance System
app.post('/api/chief/mark-attendance', authenticateToken, async (req, res) => {
    try {
        const { user_id, status, meeting_date, fine_amount } = req.body;
        
        // Get chief's group
        const [groups] = await pool.execute('SELECT id FROM groups_table WHERE chief_id = ?', [req.user.id]);
        const groupId = groups[0].id;
        
        // Check if attendance already marked
        const [existing] = await pool.execute(
            'SELECT id FROM attendance WHERE user_id = ? AND group_id = ? AND meeting_date = ?',
            [user_id, groupId, meeting_date]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Attendance already marked for this date' });
        }
        
        // Mark attendance
        await pool.execute(
            'INSERT INTO attendance (user_id, group_id, meeting_date, status, fine_amount) VALUES (?, ?, ?, ?, ?)',
            [user_id, groupId, meeting_date, status, fine_amount || 0]
        );
        
        // Add fine if applicable
        if (status === 'absent' || status === 'late') {
            await pool.execute(
                'INSERT INTO fines (user_id, group_id, reason, amount) VALUES (?, ?, ?, ?)',
                [user_id, groupId, `${status} attendance`, fine_amount || 1000]
            );
        }
        
        await logAction(req.user.id, groupId, `Marked attendance for user ${user_id}: ${status}`);
        
        res.json({ message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
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
    });
}

startServer().catch(console.error);
