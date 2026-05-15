const app = require('./app');
const pool = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Visit http://localhost:${PORT} to access the application`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log('Please ensure your MySQL database is running and configured correctly in .env file');
    process.exit(1);
  }
}

startServer();
