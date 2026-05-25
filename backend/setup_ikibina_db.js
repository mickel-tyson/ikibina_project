const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        console.log('🔄 Setting up Ikibina Management System database...');
        
        // Read and execute the SQL file
        const sql = fs.readFileSync('setup_ikibina_database.sql', 'utf8');
        await connection.execute(sql);
        
        console.log('✅ Database setup completed successfully!');
        console.log('📊 Database: ikibina_system');
        console.log('👥 Demo users created:');
        console.log('   - Admin: admin@ikibina.com / 123456');
        console.log('   - Chief: chief@ikibina.com / 123456');
        console.log('   - Members: alice@ikibina.com, bob@ikibina.com, david@ikibina.com / 123456');
        
    } catch (error) {
        console.error('❌ Database setup error:', error);
    } finally {
        await connection.end();
    }
}

setupDatabase();
