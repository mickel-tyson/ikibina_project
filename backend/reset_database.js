const mysql = require('mysql2/promise');

async function resetDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without database first
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL server');

    // Use the database
    await connection.query('USE ikibina_guardian');
    console.log('Using ikibina_guardian database');

    // Drop all tables in correct order (due to foreign keys)
    const tables = [
      'contributions',
      'notifications', 
      'loans',
      'group_members',
      'groups',
      'users'
    ];

    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Recreate all tables
    await connection.execute(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role ENUM('admin', 'chief', 'client') NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    await connection.execute(`
      CREATE TABLE groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        chief_id INT NOT NULL,
        village VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (chief_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Groups table created');

    await connection.execute(`
      CREATE TABLE group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_group_member (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Group_members table created');

    await connection.execute(`
      CREATE TABLE loans (
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
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Loans table created');

    await connection.execute(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Notifications table created');

    await connection.execute(`
      CREATE TABLE contributions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        contribution_date DATE NOT NULL,
        description VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Contributions table created');

    // Insert sample users with hashed passwords
    const bcrypt = require('bcryptjs');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const chiefPassword = await bcrypt.hash('chief123', 10);
    const clientPassword = await bcrypt.hash('client123', 10);

    await connection.execute(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin', 'admin@ikibina.com', adminPassword, 'System Administrator', '+250788123456', 'admin']
    );
    console.log('✅ Admin user created');

    await connection.execute(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['chief1', 'chief1@ikibina.com', chiefPassword, 'John Mutabazi', '+250788123457', 'chief']
    );
    console.log('✅ Chief user created');

    await connection.execute(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['client1', 'client1@ikibina.com', clientPassword, 'Mary Kantarama', '+250788123458', 'client']
    );
    console.log('✅ Client user created');

    // Create sample group
    await connection.execute(
      'INSERT INTO groups (name, description, chief_id, village) VALUES (?, ?, ?, ?)',
      ['Kigali Savings Group', 'Community savings group for Kigali village residents', 2, 'Kigali']
    );
    console.log('✅ Sample group created');

    // Add client to group
    await connection.execute(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [1, 3]
    );
    console.log('✅ Sample group member added');

    // Verify tables exist
    const [tableList] = await connection.execute('SHOW TABLES');
    console.log('✅ Tables created:', tableList.map(t => Object.values(t)[0]));

    await connection.end();
    console.log('\n🎉 Database reset completed successfully!');
    console.log('🔑 Demo credentials:');
    console.log('   Admin: admin@ikibina.com / admin123');
    console.log('   Chief: chief1@ikibina.com / chief123');
    console.log('   Client: client1@ikibina.com / client123');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

resetDatabase();
