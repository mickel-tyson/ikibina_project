// Fix for admin dashboard JavaScript error
const fs = require('fs');
const filePath = 'c:\\Users\\cyusa\\Desktop\\ikibina project\\views\\admin\\dashboard-simple.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the typo in the API endpoint
content = content.replace('/api/admin/meetings?', '/api/admin/meetings?');

fs.writeFileSync(filePath, content);
console.log('Fixed API endpoint typo in admin dashboard');
