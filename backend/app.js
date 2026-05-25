const express = require('express');
const session = require('express-session');
const path = require('path');
const { demoUsers } = require('./config/demoUsers');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chiefRoutes = require('./routes/chief');
const clientRoutes = require('./routes/client');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chief', chiefRoutes);
app.use('/api/client', clientRoutes);

app.get('/', (req, res) => {
  res.render('landing', { title: 'Ikibina Guardian - Home' });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Ikibina Guardian - Login' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Ikibina Guardian - Register' });
});

app.get('/admin', (req, res) => {
  const user = { full_name: 'System Admin', role: 'admin' };
  res.render('admin/dashboard-enhanced', { title: 'Admin Dashboard', user });
});

app.get('/chief', (req, res) => {
  const user = { full_name: 'Chief Jean Claude', role: 'chief' };
  res.render('chief/dashboard-enhanced', { title: 'Chief Dashboard', user });
});

app.get('/member', (req, res) => {
  const user = { full_name: 'Alice Member', role: 'member' };
  res.render('member/dashboard-enhanced', { title: 'Member Dashboard', user });
});

app.get('/client', (req, res) => {
  const user = { full_name: 'Alice Member', role: 'member' };
  res.render('member/dashboard-enhanced', { title: 'Member Dashboard', user });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ 
      message: 'Duplicate entry',
      error: 'This record already exists'
    });
  }
  
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ 
      message: 'Database setup required',
      error: 'Required database tables are missing'
    });
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later'
  });
});

module.exports = app;
