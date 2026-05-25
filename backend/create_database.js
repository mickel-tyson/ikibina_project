const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    // First connect without specifying database to create it
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL server');

    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS ikibina_guardian');
    console.log('Database "ikibina_guardian" created or already exists');

    // Switch to the database
    await connection.query('USE ikibina_guardian');
    console.log('Using ikibina_guardian database');

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role ENUM('admin', 'chief', 'client') NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role)
      )
    `);
    console.log('Users table created');

    // Create groups table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        chief_id INT NOT NULL,
        village VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (chief_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_chief_id (chief_id),
        INDEX idx_village (village)
      )
    `);
    console.log('Groups table created');

    // Create group_members table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_group_member (group_id, user_id),
        INDEX idx_group_id (group_id),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log('Group_members table created');

    // Create loans table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS loans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        purpose VARCHAR(500) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        interest_rate DECIMAL(5,2) DEFAULT 0.00,
        due_date DATE,
        approved_by INT,
        approved_at TIMESTAMP NULL,
        disbursed_at TIMESTAMP NULL,
        repaid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_group_id (group_id),
        INDEX idx_member_id (member_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date)
      )
    `);
    console.log('Loans table created');

    // Create notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_type (type)
      )
    `);
    console.log('Notifications table created');

    // Create contributions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contributions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        contribution_date DATE NOT NULL,
        description VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_group_id (group_id),
        INDEX idx_member_id (member_id),
        INDEX idx_contribution_date (contribution_date)
      )
    `);
    console.log('Contributions table created');

    // Insert sample users
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const chiefPassword = await bcrypt.hash('chief123', 10);
    const clientPassword = await bcrypt.hash('client123', 10);

    await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, full_name, phone, role) VALUES 
      ('admin', 'admin@ikibina.com', ?, 'System Administrator', '+250788123456', 'admin'),
      ('chief1', 'chief1@ikibina.com', ?, 'John Mutabazi', '+250788123457', 'chief'),
      ('client1', 'client1@ikibina.com', ?, 'Mary Kantarama', '+250788123458', 'client')
    `, [adminPassword, chiefPassword, clientPassword]);
    console.log('Sample users inserted');

    // Create sample group
    await connection.execute(`
      INSERT IGNORE INTO groups (name, description, chief_id, village) VALUES 
      ('Kigali Savings Group', 'Community savings group for Kigali village residents', 2, 'Kigali')
    `);
    console.log('Sample group created');

    // Add member to group
    await connection.execute(`
      INSERT IGNORE INTO group_members (group_id, user_id) VALUES (1, 3)
    `);
    console.log('Sample group member added');

    await connection.end();
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

createDatabase();
