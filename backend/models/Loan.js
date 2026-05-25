const pool = require('../config/database');

class Loan {
  static async create(loanData) {
    const { member_id, group_id, amount, interest_rate, purpose, status = 'pending', due_date } = loanData;
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO loans (member_id, group_id, amount, interest_rate, purpose, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [member_id, group_id, amount, interest_rate, purpose, status, due_date]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating loan:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT l.*, u.full_name as member_name, g.name as group_name FROM loans l LEFT JOIN users u ON l.member_id = u.id LEFT JOIN groups g ON l.group_id = g.id WHERE l.id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByMember(memberId) {
    try {
      const [rows] = await pool.execute(
        'SELECT l.*, g.name as group_name FROM loans l LEFT JOIN groups g ON l.group_id = g.id WHERE l.member_id = ? ORDER BY l.created_at DESC',
        [memberId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async findByGroup(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT l.*, u.full_name as member_name FROM loans l LEFT JOIN users u ON l.member_id = u.id WHERE l.group_id = ? ORDER BY l.created_at DESC',
        [groupId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT l.*, u.full_name as member_name, g.name as group_name FROM loans l LEFT JOIN users u ON l.member_id = u.id LEFT JOIN groups g ON l.group_id = g.id ORDER BY l.created_at DESC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const [result] = await pool.execute(
        'UPDATE loans SET status = ? WHERE id = ?',
        [status, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getGroupLoansTotal(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT SUM(amount) as total FROM loans WHERE group_id = ? AND status = "approved"',
        [groupId]
      );
      return rows[0].total || 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Loan;
