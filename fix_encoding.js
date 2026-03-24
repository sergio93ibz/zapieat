const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'prisma', 'schema.prisma');
const outputPath = path.join(__dirname, 'prisma', 'schema_nobom.prisma');

let content = fs.readFileSync(inputPath, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Schema converted to UTF-8 No-BOM');
