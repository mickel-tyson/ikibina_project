const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin, X-Requested-With, Content-Type, Accept, Authorization']
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import database connection and models
const pool = require('./config/database');
const User = require('./models/User');
const Group = require('./models/Group');
const Loan = require('./models/Loan');

// Routes
app.get('/', (req, res) => {
  res.render('landing', { title: 'Ikibina Guardian - Community Savings Management System' });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Ikibina Guardian - Login' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Ikibina Guardian - Register' });
});

app.get('/admin', (req, res) => {
  res.render('admin/dashboard', { title: 'Admin Dashboard' });
});

app.get('/chief', (req, res) => {
  res.render('chief/dashboard', { title: 'Chief Dashboard' });
});

app.get('/client', (req, res) => {
  res.render('client/dashboard', { title: 'Client Dashboard' });
});

// API Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: 'jwt-token-placeholder', // In production, use real JWT
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;
    
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user (always client role)
    const userId = await User.create({ username, email, password, full_name, phone, role: 'client' });
    
    res.status(201).json({
      message: 'Registration successful! Please login.',
      user: { id: userId, username, email, full_name, phone, role: 'client' },
      token: 'jwt-token-placeholder'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Admin Routes
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.getAll();
    const totalGroups = await Group.getAll();
    const totalLoans = await Loan.getAll();
    
    const stats = {
      totalUsers: totalUsers.length,
      totalGroups: totalGroups.length,
      totalLoans: totalLoans.length,
      chiefs: totalUsers.filter(u => u.role === 'chief').length,
      clients: totalUsers.filter(u => u.role === 'client').length,
      pendingLoans: totalLoans.filter(l => l.status === 'pending').length,
      approvedLoans: totalLoans.filter(l => l.status === 'approved').length
    };

    res.json({
      message: 'Admin dashboard data',
      stats,
      recentUsers: totalUsers.slice(0, 10),
      recentGroups: totalGroups.slice(0, 10),
      recentLoans: totalLoans.slice(0, 10)
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching admin dashboard' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

app.put('/api/admin/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { username, email, full_name, phone, role } = req.body;

    // Validate required fields
    if (!username || !email || !full_name || !role) {
      return res.status(400).json({ message: 'Username, email, full_name, and role are required' });
    }

    // Update user
    await pool.execute(
      'UPDATE users SET username = ?, email = ?, full_name = ?, phone = ?, role = ? WHERE id = ?',
      [username, email, full_name, phone, role, userId]
    );

    // Get updated user
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove password_hash from response
    delete user.password_hash;

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Username or email already exists' });
    } else {
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Prevent deleting the admin user
    const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user (cascade will handle related records)
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

app.post('/api/admin/chiefs', async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;
    
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const userId = await User.create({ username, email, password, full_name, phone, role: 'chief' });
    
    res.status(201).json({
      message: 'Chief created successfully',
      user: { id: userId, username, email, full_name, phone, role: 'chief' }
    });
  } catch (error) {
    console.error('Create chief error:', error);
    res.status(500).json({ message: 'Server error creating chief' });
  }
});

app.get('/api/admin/groups', async (req, res) => {
  try {
    const groups = await Group.getAll();
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

app.get('/api/admin/loans', async (req, res) => {
  try {
    const loans = await Loan.getAll();
    res.json({ loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ message: 'Server error fetching loans' });
  }
});

// Chief Routes
app.get('/api/chief/dashboard', async (req, res) => {
  try {
    // For demo, assume chief_id = 2
    const chiefId = 2;
    const groups = await Group.findByChief(chiefId);
    const allLoans = [];
    
    for (const group of groups) {
      const groupLoans = await Loan.findByGroup(group.id);
      allLoans.push(...groupLoans);
    }

    const stats = {
      totalGroups: groups.length,
      totalLoans: allLoans.length,
      pendingLoans: allLoans.filter(l => l.status === 'pending').length,
      approvedLoans: allLoans.filter(l => l.status === 'approved').length
    };

    res.json({
      message: 'Chief dashboard data',
      stats,
      groups,
      recentLoans: allLoans.slice(0, 10)
    });
  } catch (error) {
    console.error('Chief dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching chief dashboard' });
  }
});

app.get('/api/chief/groups', async (req, res) => {
  try {
    const chiefId = 2; // For demo
    const groups = await Group.findByChief(chiefId);
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

app.post('/api/chief/groups', async (req, res) => {
  try {
    const { name, description, village } = req.body;
    const chiefId = 2; // For demo
    
    if (!name || !village) {
      return res.status(400).json({ message: 'Group name and village are required' });
    }

    const groupId = await Group.create({ name, description, chief_id: chiefId, village });
    
    res.status(201).json({
      message: 'Group created successfully',
      group: { id: groupId, name, description, chief_id: chiefId, village }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
});

app.put('/api/chief/groups/:groupId', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { name, description, village } = req.body;
    const chiefId = 2; // For demo
    
    // Verify chief owns this group
    const group = await Group.findById(groupId);
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to edit this group' });
    }

    if (!name || !village) {
      return res.status(400).json({ message: 'Group name and village are required' });
    }

    // Update group
    await pool.execute(
      'UPDATE groups SET name = ?, description = ?, village = ? WHERE id = ?',
      [name, description, village, groupId]
    );
    
    res.json({
      message: 'Group updated successfully',
      group: { id: groupId, name, description, village }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error updating group' });
  }
});

app.delete('/api/chief/groups/:groupId', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const chiefId = 2; // For demo
    
    // Verify chief owns this group
    const group = await Group.findById(groupId);
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to delete this group' });
    }

    // Delete group (cascade will handle related records)
    await pool.execute('DELETE FROM groups WHERE id = ?', [groupId]);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error deleting group' });
  }
});

// Group Members Management
app.get('/api/chief/groups/:groupId/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const chiefId = 2; // For demo
    
    // Verify chief owns this group
    const group = await Group.findById(groupId);
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to manage this group' });
    }

    // Get group members
    const [members] = await pool.execute(
      'SELECT u.id, u.username, u.full_name, u.phone, u.email, gm.joined_at FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY gm.joined_at',
      [groupId]
    );

    res.json({ members });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ message: 'Server error fetching group members' });
  }
});

app.get('/api/chief/available-members', async (req, res) => {
  try {
    const { groupId } = req.query;
    const chiefId = 2; // For demo
    
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    // Verify chief owns this group
    const group = await Group.findById(parseInt(groupId));
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to manage this group' });
    }

    // Get users who are clients and not already in this group
    const [availableUsers] = await pool.execute(
      'SELECT id, username, full_name, phone, email FROM users WHERE role = ? AND id NOT IN (SELECT user_id FROM group_members WHERE group_id = ?)',
      ['client', parseInt(groupId)]
    );

    res.json({ users: availableUsers });
  } catch (error) {
    console.error('Get available members error:', error);
    res.status(500).json({ message: 'Server error fetching available members' });
  }
});

app.post('/api/chief/groups/:groupId/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { userId } = req.body;
    const chiefId = 2; // For demo
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify chief owns this group
    const group = await Group.findById(groupId);
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to manage this group' });
    }

    // Add member to group
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, userId]
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'User is already a member of this group' });
    } else {
      res.status(500).json({ message: 'Server error adding member' });
    }
  }
});

app.delete('/api/chief/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);
    const chiefId = 2; // For demo
    
    // Verify chief owns this group
    const group = await Group.findById(groupId);
    if (!group || group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'You do not have permission to manage this group' });
    }

    // Remove member from group
    const [result] = await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
});

// Client Routes
app.get('/api/client/dashboard', async (req, res) => {
  try {
    const clientId = 3; // For demo
    
    // Get user's groups from group_members table
    const [userGroups] = await pool.execute(
      'SELECT g.*, gm.joined_at FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ?',
      [clientId]
    );

    // Get user's contributions
    const [contributions] = await pool.execute(
      'SELECT c.*, g.name as group_name FROM contributions c JOIN groups g ON c.group_id = g.id WHERE c.member_id = ? ORDER BY c.contribution_date DESC',
      [clientId]
    );

    // Get user's loans
    const [loans] = await pool.execute(
      'SELECT l.*, g.name as group_name FROM loans l JOIN groups g ON l.group_id = g.id WHERE l.member_id = ? ORDER BY l.created_at DESC',
      [clientId]
    );

    // Calculate totals
    const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const pendingLoans = loans.filter(l => l.status === 'pending').length;

    const stats = {
      totalGroups: userGroups.length,
      totalContributions,
      totalLoans: loans.length,
      pendingLoans
    };

    res.json({
      message: 'Client dashboard data',
      stats,
      groups: userGroups,
      recentContributions: contributions.slice(0, 5),
      loans
    });
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching client dashboard' });
  }
});

app.get('/api/client/contributions', async (req, res) => {
  try {
    const clientId = 3; // For demo
    res.json({
      contributions: [
        { id: 1, group_name: 'Kigali Savings Group', amount: 50000, contribution_date: new Date(), description: 'Monthly savings' }
      ],
      total: 50000
    });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ message: 'Server error fetching contributions' });
  }
});

app.get('/api/client/loans', async (req, res) => {
  try {
    const clientId = 3; // For demo
    const loans = await Loan.findByMember(clientId);
    res.json({ loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ message: 'Server error fetching loans' });
  }
});

app.get('/api/client/groups', async (req, res) => {
  try {
    const clientId = 3; // For demo
    res.json({
      groups: [
        { id: 1, name: 'Kigali Savings Group', description: 'Community savings', village: 'Kigali', chief_name: 'John Mutabazi', joined_at: new Date() }
      ]
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

app.post('/api/client/loans/request', async (req, res) => {
  try {
    const { group_id, amount, interest_rate, purpose } = req.body;
    const clientId = 3; // For demo
    
    if (!group_id || !amount || !purpose) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate due date (e.g., 6 months from now)
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 6);

    const loanId = await Loan.create({
      member_id: clientId,
      group_id,
      amount,
      interest_rate: interest_rate || 5,
      purpose,
      due_date: dueDate
    });

    res.status(201).json({
      message: 'Loan request submitted successfully',
      loan: { id: loanId, member_id: clientId, group_id, amount, purpose, status: 'pending' }
    });
  } catch (error) {
    console.error('Request loan error:', error);
    res.status(500).json({ message: 'Server error requesting loan' });
  }
});

// New client payment endpoints
app.post('/api/client/contributions', async (req, res) => {
  try {
    const { group_id, amount, description } = req.body;
    const clientId = 3; // For demo
    
    if (!group_id || !amount) {
      return res.status(400).json({ message: 'Group and amount are required' });
    }

    // Record contribution
    const [result] = await pool.execute(
      'INSERT INTO contributions (group_id, member_id, amount, contribution_date, description) VALUES (?, ?, ?, ?, ?)',
      [group_id, clientId, amount, new Date(), description || 'Contribution via website']
    );

    res.status(201).json({
      message: 'Contribution recorded successfully',
      contribution: { id: result.insertId, group_id, member_id: clientId, amount, contribution_date: new Date() }
    });
  } catch (error) {
    console.error('Make contribution error:', error);
    res.status(500).json({ message: 'Server error recording contribution' });
  }
});

app.get('/api/client/groups/:groupId/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const clientId = 3; // For demo
    
    // Verify user is a member of this group
    const [membership] = await pool.execute(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, clientId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get all group members
    const [members] = await pool.execute(
      'SELECT u.id, u.username, u.full_name, u.phone, gm.joined_at FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY gm.joined_at',
      [groupId]
    );

    res.json({ members });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ message: 'Server error fetching group members' });
  }
});

app.get('/api/client/payment-history', async (req, res) => {
  try {
    const clientId = 3; // For demo
    
    // Get detailed payment history
    const [contributions] = await pool.execute(
      'SELECT c.*, g.name as group_name FROM contributions c JOIN groups g ON c.group_id = g.id WHERE c.member_id = ? ORDER BY c.contribution_date DESC',
      [clientId]
    );

    // Calculate payment statistics
    const totalAmount = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthContributions = contributions.filter(c => new Date(c.contribution_date) >= thisMonth);
    const thisMonthTotal = thisMonthContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    res.json({
      contributions,
      stats: {
        totalContributions: contributions.length,
        totalAmount,
        thisMonthContributions: thisMonthContributions.length,
        thisMonthTotal
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ message: 'Server error fetching payment history' });
  }
});

app.get('/api/client/upcoming-payments', async (req, res) => {
  try {
    const clientId = 3; // For demo
    
    // Get user's groups to determine expected payment schedule
    const [groups] = await pool.execute(
      'SELECT g.* FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ?',
      [clientId]
    );

    // For demo, assume monthly payments of 50,000 RWF per group
    const upcomingPayments = [];
    const today = new Date();
    
    for (const group of groups) {
      // Generate next 3 months of expected payments
      for (let i = 0; i < 3; i++) {
        const paymentDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
        
        // Check if payment already made for this month
        const [existingPayment] = await pool.execute(
          'SELECT * FROM contributions WHERE group_id = ? AND member_id = ? AND contribution_date >= ? AND contribution_date < ?',
          [group.id, clientId, paymentDate, dueDate]
        );

        if (existingPayment.length === 0) {
          upcomingPayments.push({
            group_id: group.id,
            group_name: group.name,
            expected_amount: 50000,
            due_date: dueDate,
            status: 'pending',
            description: `Monthly contribution for ${group.name}`
          });
        }
      }
    }

    res.json({ upcomingPayments });
  } catch (error) {
    console.error('Upcoming payments error:', error);
    res.status(500).json({ message: 'Server error fetching upcoming payments' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit http://localhost:${PORT} to access the application`);
  console.log(`🔑 Connected to MySQL database`);
});
