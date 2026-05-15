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
        
        console.log('✅ Database tables created/verified');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
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

// Middleware to check authentication
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
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

// Authentication routes
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
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
            { expiresIn: '24h' }
        );
        
        await logAction(user.id, null, 'User logged in');
        
        res.json({
            message: 'Login successful',
            access_token: token,
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

// Dashboard routes based on role
app.get('/dashboard', authenticateToken, async (req, res) => {
    const role = req.user.role;
    
    switch(role) {
        case 'admin':
            res.render('admin/dashboard-simple', { title: 'Admin Dashboard', user: req.user });
            break;
        case 'chief':
            res.render('chief/dashboard-simple', { title: 'Chief Dashboard', user: req.user });
            break;
        case 'member':
            res.render('member/dashboard-simple', { title: 'Member Dashboard', user: req.user });
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
    res.render('admin/dashboard-simple', { title: 'Admin Dashboard', user: req.user });
});

app.get('/chief', authenticateToken, async (req, res) => {
    if (req.user.role !== 'chief') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('chief/dashboard-simple', { title: 'Chief Dashboard', user: req.user });
});

app.get('/member', authenticateToken, async (req, res) => {
    if (req.user.role !== 'member') {
        return res.status(403).json({ message: 'Access denied' });
    }
    res.render('member/dashboard-simple', { title: 'Member Dashboard', user: req.user });
});

// API Routes for Admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
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

// API Routes for Chief
app.get('/api/chief/my-group', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not available' });
        }
        
        const [groups] = await pool.execute(
            'SELECT * FROM groups_table WHERE chief_id = ?',
            [req.user.id]
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

app.get('/api/chief/members', authenticateToken, async (req, res) => {
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
        `, [req.user.id]);
        
        res.json({ members });
    } catch (error) {
        console.error('Chief members error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// API Routes for Member
app.get('/api/member/profile', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ user: req.user, membership: null });
        }
        
        const [user] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const [membership] = await pool.execute(`
            SELECT m.*, g.group_name, g.contribution_amount, g.frequency, g.draw_day
            FROM memberships m
            JOIN groups_table g ON m.group_id = g.id
            WHERE m.user_id = ?
        `, [req.user.id]);
        
        res.json({
            user: user[0],
            membership: membership[0] || null
        });
    } catch (error) {
        console.error('Member profile error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/member/contributions', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ contributions: [] });
        }
        
        const [contributions] = await pool.execute(
            'SELECT * FROM contributions WHERE user_id = ? ORDER BY paid_at DESC',
            [req.user.id]
        );
        res.json({ contributions });
    } catch (error) {
        console.error('Member contributions error:', error.message);
        res.status(500).json({ message: 'Server error' });
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
    });
}

startServer().catch(console.error);
