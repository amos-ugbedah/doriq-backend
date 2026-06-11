const fs = require('fs');

// Read the current file
let content = fs.readFileSync('serviceAccountKey.json', 'utf8');

// Fix the private key by replacing literal \n with actual newlines
// But keep the JSON structure intact
content = content.replace(/\\n/g, '\n');

// Parse and re-stringify to ensure valid JSON
const data = JSON.parse(content);

// Write back with proper formatting
fs.writeFileSync('serviceAccountKey.json', JSON.stringify(data, null, 2));
console.log('✅ Fixed serviceAccountKey.json');
