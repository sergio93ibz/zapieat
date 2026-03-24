const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

// We'll read the file, but more importantly, we'll write a clean version.
// Using a template for the header.
const cleanHeader = `// ZasFood Schema
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

// Read the old file to get the models
try {
    const rawContent = fs.readFileSync(schemaPath, 'utf8');
    const lines = rawContent.split(/\r?\n/);
    let startIndex = lines.findIndex(l => l.includes('enum UserRole') || l.includes('model '));
    if (startIndex === -1) startIndex = 14; 

    const modelsContent = lines.slice(startIndex).join('\n');
    fs.writeFileSync(schemaPath, cleanHeader + '\n' + modelsContent, 'utf8');
    console.log('SUCCESS: Schema rewritten on server.');
} catch (e) {
    console.error('FAILED to rewrite schema:', e.message);
    process.exit(1);
}
