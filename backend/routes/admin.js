const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const {
  getDashboard,
  getAllUsers,
  createChief,
  deleteChief,
  getAllGroups,
  getAllLoans
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware);
router.use(roleCheck(['admin']));

router.get('/dashboard', getDashboard);
router.get('/users', getAllUsers);
router.post('/chiefs', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number')
], createChief);
router.delete('/chiefs/:id', deleteChief);
router.get('/groups', getAllGroups);
router.get('/loans', getAllLoans);

module.exports = router;
