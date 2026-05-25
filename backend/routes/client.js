const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const {
  getDashboard,
  getContributions,
  getLoans,
  getGroups,
  requestLoan
} = require('../controllers/clientController');

const router = express.Router();

router.use(authMiddleware);
router.use(roleCheck(['client']));

router.get('/dashboard', getDashboard);
router.get('/contributions', getContributions);
router.get('/loans', getLoans);
router.get('/groups', getGroups);
router.post('/loans/request', [
  body('group_id').isInt().withMessage('Group ID must be an integer'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('interest_rate').isFloat({ min: 0 }).withMessage('Interest rate must be a positive number'),
  body('repayment_period').isInt({ min: 1 }).withMessage('Repayment period must be at least 1 month'),
  body('purpose').notEmpty().withMessage('Loan purpose is required')
], requestLoan);

module.exports = router;
