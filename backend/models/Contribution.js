const pool = require('../config/database');

class Contribution {
  static async create(contributionData) {
    const { member_id, group_id, amount, contribution_date, description } = contributionData;
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO contributions (member_id, group_id, amount, contribution_date, description) VALUES (?, ?, ?, ?, ?)',
        [member_id, group_id, amount, contribution_date || new Date(), description]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async findByMember(memberId) {
    try {
      const [rows] = await pool.execute(
        'SELECT c.*, g.name as group_name FROM contributions c LEFT JOIN groups g ON c.group_id = g.id WHERE c.member_id = ? ORDER BY c.contribution_date DESC',
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
        'SELECT c.*, u.full_name as member_name FROM contributions c LEFT JOIN users u ON c.member_id = u.id WHERE c.group_id = ? ORDER BY c.contribution_date DESC',
        [groupId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getGroupTotal(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT SUM(amount) as total FROM contributions WHERE group_id = ?',
        [groupId]
      );
      return rows[0].total || 0;
    } catch (error) {
      throw error;
    }
  }

  static async getMemberTotal(memberId) {
    try {
      const [rows] = await pool.execute(
        'SELECT SUM(amount) as total FROM contributions WHERE member_id = ?',
        [memberId]
      );
      return rows[0].total || 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Contribution;
