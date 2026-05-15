const User = require('../models/User');
const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const Loan = require('../models/Loan');

const getDashboard = async (req, res) => {
  try {
    const clientId = req.user.id;
    const contributions = await Contribution.findByMember(clientId);
    const loans = await Loan.findByMember(clientId);
    
    const pool = require('../config/database');
    const [groupMembers] = await pool.execute(
      'SELECT g.*, gm.joined_at FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.member_id = ?',
      [clientId]
    );

    const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalLoans = loans.filter(l => l.status === 'approved').reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const pendingLoans = loans.filter(l => l.status === 'pending').length;

    res.json({
      message: 'Client dashboard data',
      stats: {
        totalGroups: groupMembers.length,
        totalContributions,
        totalLoans,
        pendingLoans,
        totalContributionsCount: contributions.length,
        approvedLoans: loans.filter(l => l.status === 'approved').length
      },
      groups: groupMembers,
      recentContributions: contributions.slice(0, 10),
      recentLoans: loans.slice(0, 10)
    });
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching client dashboard' });
  }
};

const getContributions = async (req, res) => {
  try {
    const clientId = req.user.id;
    const contributions = await Contribution.findByMember(clientId);
    const total = await Contribution.getMemberTotal(clientId);

    res.json({ contributions, total });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ message: 'Server error fetching contributions' });
  }
};

const getLoans = async (req, res) => {
  try {
    const clientId = req.user.id;
    const loans = await Loan.findByMember(clientId);

    res.json({ loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ message: 'Server error fetching loans' });
  }
};

const getGroups = async (req, res) => {
  try {
    const clientId = req.user.id;
    const pool = require('../config/database');
    
    const [groupMembers] = await pool.execute(
      'SELECT g.*, gm.joined_at FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.member_id = ?',
      [clientId]
    );

    res.json({ groups: groupMembers });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

const requestLoan = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { group_id, amount, interest_rate, repayment_period, purpose } = req.body;

    const pool = require('../config/database');
    const [groupMembers] = await pool.execute(
      'SELECT * FROM group_members WHERE group_id = ? AND member_id = ?',
      [group_id, clientId]
    );

    if (groupMembers.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const loanId = await Loan.create({
      member_id: clientId,
      group_id,
      amount,
      interest_rate,
      repayment_period,
      purpose
    });

    res.status(201).json({
      message: 'Loan request submitted successfully',
      loan: { id: loanId, member_id: clientId, group_id, amount, interest_rate, repayment_period, purpose, status: 'pending' }
    });
  } catch (error) {
    console.error('Request loan error:', error);
    res.status(500).json({ message: 'Server error requesting loan' });
  }
};

module.exports = {
  getDashboard,
  getContributions,
  getLoans,
  getGroups,
  requestLoan
};
