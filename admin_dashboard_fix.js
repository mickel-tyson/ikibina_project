const fs = require('fs');

// Read the admin dashboard file
const filePath = 'c:\\Users\\cyusa\\Desktop\\ikibina project\\views\\admin\\dashboard-simple.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the typo in the API endpoint - change 'meetings' to 'meetings'
content = content.replace(/\/api\/admin\/meetings\?/g, '/api/admin/meetings?');

// Write the fixed content back
fs.writeFileSync(filePath, content);

console.log('Fixed API endpoint typo in admin dashboard');
