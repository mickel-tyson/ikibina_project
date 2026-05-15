const pool = require('../config/database');

class Group {
  static async create(groupData) {
    const { name, description, chief_id, village } = groupData;
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO groups (name, description, chief_id, village) VALUES (?, ?, ?, ?)',
        [name, description, chief_id, village]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT g.*, u.full_name as chief_name FROM groups g LEFT JOIN users u ON g.chief_id = u.id WHERE g.id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByChief(chiefId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM groups WHERE chief_id = ? ORDER BY created_at DESC',
        [chiefId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT g.*, u.full_name as chief_name FROM groups g LEFT JOIN users u ON g.chief_id = u.id ORDER BY g.created_at DESC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM groups WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getMemberCount(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
        [groupId]
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Group;
