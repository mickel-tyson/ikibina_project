const Group = require('../models/Group');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Loan = require('../models/Loan');

const getDashboard = async (req, res) => {
  try {
    const chiefId = req.user.id;
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
};

const createGroup = async (req, res) => {
  try {
    const { name, description, village } = req.body;
    const chiefId = req.user.id;
    
    const groupId = await Group.create({ name, description, chief_id: chiefId, village });
    
    res.status(201).json({
      message: 'Group created successfully',
      group: { id: groupId, name, description, chief_id: chiefId, village }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

const getGroups = async (req, res) => {
  try {
    const chiefId = req.user.id;
    const groups = await Group.findByChief(chiefId);
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const pool = require('../config/database');
    await pool.execute(
      'INSERT INTO group_members (group_id, member_id) VALUES (?, ?)',
      [groupId, userId]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
};

const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const pool = require('../config/database');
    await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND member_id = ?',
      [groupId, userId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

const recordContribution = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { member_id, amount, description } = req.body;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const contributionId = await Contribution.create({
      member_id,
      group_id: groupId,
      amount,
      description
    });

    res.status(201).json({
      message: 'Contribution recorded successfully',
      contribution: { id: contributionId, member_id, group_id: groupId, amount, description }
    });
  } catch (error) {
    console.error('Record contribution error:', error);
    res.status(500).json({ message: 'Server error recording contribution' });
  }
};

const getGroupContributions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const contributions = await Contribution.findByGroup(groupId);
    const total = await Contribution.getGroupTotal(groupId);

    res.json({ contributions, total });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ message: 'Server error fetching contributions' });
  }
};

const issueLoan = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { member_id, amount, interest_rate, repayment_period, purpose } = req.body;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const loanId = await Loan.create({
      member_id,
      group_id: groupId,
      amount,
      interest_rate,
      repayment_period,
      purpose
    });

    res.status(201).json({
      message: 'Loan issued successfully',
      loan: { id: loanId, member_id, group_id: groupId, amount, interest_rate, repayment_period, purpose, status: 'pending' }
    });
  } catch (error) {
    console.error('Issue loan error:', error);
    res.status(500).json({ message: 'Server error issuing loan' });
  }
};

const getGroupLoans = async (req, res) => {
  try {
    const { groupId } = req.params;
    const chiefId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    const loans = await Loan.findByGroup(groupId);

    res.json({ loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ message: 'Server error fetching loans' });
  }
};

const updateLoanStatus = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { status } = req.body;
    const chiefId = req.user.id;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const group = await Group.findById(loan.group_id);
    if (group.chief_id !== chiefId) {
      return res.status(403).json({ message: 'Access denied. You are not the chief of this group.' });
    }

    await Loan.updateStatus(loanId, status);

    res.json({ message: 'Loan status updated successfully' });
  } catch (error) {
    console.error('Update loan status error:', error);
    res.status(500).json({ message: 'Server error updating loan status' });
  }
};

module.exports = {
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
};
