const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const {
  getDashboard,
  createGroup,
  getGroups,
  addMember,
  removeMember,
  recordContribution,
  getGroupContributions,
  issueLoan,
  getGroupLoans,
  updateLoanStatus
} = require('../controllers/chiefController');

const router = express.Router();

router.use(authMiddleware);
router.use(roleCheck(['chief']));

router.get('/dashboard', getDashboard);
router.get('/groups', getGroups);
router.post('/groups', [
  body('name').notEmpty().withMessage('Group name is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('village').notEmpty().withMessage('Village is required')
], createGroup);
router.post('/groups/:groupId/members', [
  body('userId').isInt().withMessage('User ID must be an integer')
], addMember);
router.delete('/groups/:groupId/members/:userId', removeMember);
router.post('/groups/:groupId/contributions', [
  body('member_id').isInt().withMessage('Member ID must be an integer'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description too long')
], recordContribution);
router.get('/groups/:groupId/contributions', getGroupContributions);
router.post('/groups/:groupId/loans', [
  body('member_id').isInt().withMessage('Member ID must be an integer'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('interest_rate').isFloat({ min: 0 }).withMessage('Interest rate must be a positive number'),
  body('repayment_period').isInt({ min: 1 }).withMessage('Repayment period must be at least 1 month'),
  body('purpose').notEmpty().withMessage('Loan purpose is required')
], issueLoan);
router.get('/groups/:groupId/loans', getGroupLoans);
router.put('/loans/:loanId/status', [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status')
], updateLoanStatus);

module.exports = router;
