const fs = require('fs');

// Read admin dashboard file
const filePath = 'c:\\Users\\cyusa\\Desktop\\ikibina project\\views\\admin\\dashboard-simple.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the old duplicate showSection function (lines 851-896)
const lines = content.split('\n');
const newLines = lines.filter((line, index) => index < 848 || index > 896);
const fixedContent = newLines.join('\n');

// Write fixed content back
fs.writeFileSync(filePath, fixedContent);

console.log('Removed duplicate showSection function from admin dashboard');
