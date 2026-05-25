const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        console.log('🔄 Testing MySQL connection...');
        
        // Test basic connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Check if database exists
        const [databases] = await connection.execute('SHOW DATABASES LIKE "ikibina_system"');
        if (databases.length > 0) {
            console.log('✅ Database "ikibina_system" exists');
            
            // Test database connection
            await connection.execute('USE ikibina_system');
            console.log('✅ Can access ikibina_system database');
            
            // Check if users table exists
            const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
            if (tables.length > 0) {
                console.log('✅ Users table exists');
                
                // Check if admin user exists
                const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@ikibina.com']);
                if (users.length > 0) {
                    console.log('✅ Admin user exists');
                    console.log('👤 Admin:', users[0].full_name);
                } else {
                    console.log('❌ Admin user not found');
                }
            } else {
                console.log('❌ Users table not found');
            }
        } else {
            console.log('❌ Database "ikibina_system" does not exist');
        }
        
        await connection.end();
        console.log('✅ Connection test completed');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.log('\n💡 Possible solutions:');
        console.log('1. Make sure MySQL server is running');
        console.log('2. Check MySQL username/password (currently: root/empty)');
        console.log('3. Run: node setup_ikibina_db.js to create database');
    }
}

testConnection();
