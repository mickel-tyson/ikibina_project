const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Mock API endpoints for demo
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  let user = null;
  if (email === 'admin@ikibina.com' && password === 'admin123') {
    user = { id: 1, username: 'admin', email, full_name: 'System Administrator', role: 'admin' };
  } else if (email === 'chief1@ikibina.com' && password === 'chief123') {
    user = { id: 2, username: 'chief1', email, full_name: 'John Mutabazi', role: 'chief' };
  } else if (email === 'client1@ikibina.com' && password === 'client123') {
    user = { id: 3, username: 'client1', email, full_name: 'Mary Kantarama', role: 'client' };
  }
  
  if (user) {
    res.json({
      message: 'Login successful',
      token: 'demo-token',
      user
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// Registration endpoint - always creates client users
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, full_name, phone } = req.body;
  
  // Mock validation
  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }
  
  // Create new client user (mock)
  const newUser = {
    id: Math.floor(Math.random() * 1000) + 100,
    username,
    email,
    full_name,
    phone: phone || 'N/A',
    role: 'client'
  };
  
  res.status(201).json({
    message: 'Registration successful! Please login.',
    user: newUser,
    token: 'demo-token'
  });
});

// Mock dashboard data
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    message: 'Admin dashboard data',
    stats: {
      totalUsers: 3,
      totalGroups: 1,
      totalLoans: 1,
      pendingLoans: 1
    },
    recentUsers: [
      { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin', created_at: new Date() },
      { id: 2, username: 'chief1', full_name: 'John Mutabazi', role: 'chief', created_at: new Date() },
      { id: 3, username: 'client1', full_name: 'Mary Kantarama', role: 'client', created_at: new Date() }
    ],
    recentGroups: [
      { id: 1, name: 'Kigali Savings Group', chief_name: 'John Mutabazi', village: 'Kigali', created_at: new Date() }
    ],
    recentLoans: [
      { id: 1, member_name: 'Mary Kantarama', group_name: 'Kigali Savings Group', amount: 100000, status: 'pending', created_at: new Date() }
    ]
  });
});

app.get('/api/chief/dashboard', (req, res) => {
  res.json({
    message: 'Chief dashboard data',
    stats: {
      totalGroups: 1,
      totalLoans: 1,
      pendingLoans: 1,
      approvedLoans: 0
    },
    groups: [
      { id: 1, name: 'Kigali Savings Group', village: 'Kigali', created_at: new Date() }
    ],
    recentLoans: [
      { id: 1, member_name: 'Mary Kantarama', amount: 100000, status: 'pending', created_at: new Date() }
    ]
  });
});

app.get('/api/client/dashboard', (req, res) => {
  res.json({
    message: 'Client dashboard data',
    stats: {
      totalGroups: 1,
      totalContributions: 50000,
      totalLoans: 0,
      pendingLoans: 0
    },
    groups: [
      { id: 1, name: 'Kigali Savings Group', village: 'Kigali', joined_at: new Date() }
    ],
    recentContributions: [
      { group_name: 'Kigali Savings Group', amount: 50000, contribution_date: new Date() }
    ]
  });
});

// Additional API endpoints for full functionality

// Client routes
app.get('/api/client/contributions', (req, res) => {
  res.json({
    contributions: [
      { id: 1, group_name: 'Kigali Savings Group', amount: 50000, contribution_date: new Date(), description: 'Monthly savings' },
      { id: 2, group_name: 'Kigali Savings Group', amount: 30000, contribution_date: new Date(Date.now() - 30*24*60*60*1000), description: 'Additional contribution' }
    ],
    total: 80000
  });
});

app.get('/api/client/loans', (req, res) => {
  res.json({
    loans: [
      { id: 1, group_name: 'Kigali Savings Group', amount: 100000, interest_rate: 5, purpose: 'Business expansion', status: 'pending', created_at: new Date() }
    ]
  });
});

app.get('/api/client/groups', (req, res) => {
  res.json({
    groups: [
      { id: 1, name: 'Kigali Savings Group', description: 'Community savings for Kigali residents', village: 'Kigali', chief_name: 'John Mutabazi', joined_at: new Date() }
    ]
  });
});

app.post('/api/client/loans/request', (req, res) => {
  const { group_id, amount, interest_rate, repayment_period, purpose } = req.body;
  
  if (!group_id || !amount || !purpose) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  const newLoan = {
    id: Math.floor(Math.random() * 1000) + 1,
    group_id,
    amount,
    interest_rate: interest_rate || 5,
    repayment_period,
    purpose,
    status: 'pending',
    created_at: new Date()
  };
  
  res.status(201).json({
    message: 'Loan request submitted successfully',
    loan: newLoan
  });
});

// Chief routes
app.get('/api/chief/groups', (req, res) => {
  res.json({
    groups: [
      { id: 1, name: 'Kigali Savings Group', description: 'Community savings for Kigali residents', village: 'Kigali', created_at: new Date() }
    ]
  });
});

app.post('/api/chief/groups', (req, res) => {
  const { name, description, village } = req.body;
  
  if (!name || !village) {
    return res.status(400).json({ message: 'Group name and village are required' });
  }
  
  const newGroup = {
    id: Math.floor(Math.random() * 1000) + 1,
    name,
    description,
    village,
    chief_id: 2,
    created_at: new Date()
  };
  
  res.status(201).json({
    message: 'Group created successfully',
    group: newGroup
  });
});

app.get('/api/chief/groups/:groupId/contributions', (req, res) => {
  const groupId = parseInt(req.params.groupId);
  
  res.json({
    contributions: [
      { id: 1, member_id: 3, group_id: groupId, amount: 50000, contribution_date: new Date(), description: 'Monthly savings', member_name: 'Mary Kantarama' },
      { id: 2, member_id: 3, group_id: groupId, amount: 30000, contribution_date: new Date(Date.now() - 30*24*60*60*1000), description: 'Additional contribution', member_name: 'Mary Kantarama' }
    ],
    total: 80000
  });
});

app.post('/api/chief/groups/:groupId/contributions', (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const { member_id, amount, description } = req.body;
  
  if (!member_id || !amount) {
    return res.status(400).json({ message: 'Member and amount are required' });
  }
  
  const newContribution = {
    id: Math.floor(Math.random() * 1000) + 1,
    member_id,
    group_id: groupId,
    amount,
    description,
    contribution_date: new Date()
  };
  
  res.status(201).json({
    message: 'Contribution recorded successfully',
    contribution: newContribution
  });
});

app.get('/api/chief/groups/:groupId/loans', (req, res) => {
  const groupId = parseInt(req.params.groupId);
  
  res.json({
    loans: [
      { id: 1, member_id: 3, group_id: groupId, amount: 100000, interest_rate: 5, purpose: 'Business expansion', status: 'pending', created_at: new Date(), member_name: 'Mary Kantarama' }
    ]
  });
});

app.post('/api/chief/groups/:groupId/loans', (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const { member_id, amount, interest_rate, repayment_period, purpose } = req.body;
  
  if (!member_id || !amount || !purpose) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  const newLoan = {
    id: Math.floor(Math.random() * 1000) + 1,
    member_id,
    group_id: groupId,
    amount,
    interest_rate: interest_rate || 5,
    repayment_period,
    purpose,
    status: 'pending',
    created_at: new Date()
  };
  
  res.status(201).json({
    message: 'Loan issued successfully',
    loan: newLoan
  });
});

app.put('/api/chief/loans/:loanId/status', (req, res) => {
  const { status } = req.body;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  res.json({
    message: `Loan ${status} successfully`
  });
});

// Admin routes
app.get('/api/admin/users', (req, res) => {
  res.json({
    users: [
      { id: 1, username: 'admin', email: 'admin@ikibina.com', full_name: 'System Administrator', role: 'admin', created_at: new Date() },
      { id: 2, username: 'chief1', email: 'chief1@ikibina.com', full_name: 'John Mutabazi', role: 'chief', created_at: new Date() },
      { id: 3, username: 'client1', email: 'client1@ikibina.com', full_name: 'Mary Kantarama', role: 'client', created_at: new Date() }
    ]
  });
});

app.post('/api/admin/chiefs', (req, res) => {
  const { username, email, password, full_name, phone } = req.body;
  
  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }
  
  const newChief = {
    id: Math.floor(Math.random() * 1000) + 1,
    username,
    email,
    full_name,
    phone: phone || 'N/A',
    role: 'chief'
  };
  
  res.status(201).json({
    message: 'Chief created successfully',
    user: newChief
  });
});

app.delete('/api/admin/chiefs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (id === 2) {
    res.json({ message: 'Chief deleted successfully' });
  } else {
    res.status(404).json({ message: 'Chief not found' });
  }
});

app.get('/api/admin/groups', (req, res) => {
  res.json({
    groups: [
      { id: 1, name: 'Kigali Savings Group', description: 'Community savings for Kigali residents', village: 'Kigali', chief_name: 'John Mutabazi', created_at: new Date() }
    ]
  });
});

app.get('/api/admin/loans', (req, res) => {
  res.json({
    loans: [
      { id: 1, member_name: 'Mary Kantarama', group_name: 'Kigali Savings Group', amount: 100000, interest_rate: 5, purpose: 'Business expansion', status: 'pending', created_at: new Date() }
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Demo server running on port ${PORT}`);
  console.log(`📱 Visit http://localhost:${PORT} to access the application`);
  console.log(`🔑 Demo credentials are displayed on the login page`);
});
