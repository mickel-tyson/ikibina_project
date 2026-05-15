const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        // Connect to MySQL without database specified
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        // Create database if not exists
        await connection.execute('CREATE DATABASE IF NOT EXISTS ikibina_system');
        await connection.execute('USE ikibina_system');

        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(150) UNIQUE,
                phone VARCHAR(30) UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin','chief','member') NOT NULL,
                status ENUM('active','inactive','suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert demo users with plain passwords (will be hashed)
        const demoUsers = [
            {
                full_name: 'System Admin',
                email: 'admin@ikibina.com',
                phone: '0788000001',
                password: '123456',
                role: 'admin'
            },
            {
                full_name: 'Chief Jean Claude',
                email: 'chief@ikibina.com',
                phone: '0788000002',
                password: '123456',
                role: 'chief'
            },
            {
                full_name: 'Alice Member',
                email: 'alice@ikibina.com',
                phone: '0788000003',
                password: '123456',
                role: 'member'
            }
        ];

        for (const user of demoUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await connection.execute(
                'INSERT IGNORE INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
                [user.full_name, user.email, user.phone, hashedPassword, user.role]
            );
        }

        console.log('✅ Database setup completed successfully!');
        console.log('📋 Demo users created:');
        console.log('   Admin: admin@ikibina.com / 123456');
        console.log('   Chief: chief@ikibina.com / 123456');
        console.log('   Member: alice@ikibina.com / 123456');

        await connection.end();
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();
