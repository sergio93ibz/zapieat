const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'prisma', 'schema.prisma');
const outputPath = path.join(__dirname, 'prisma', 'schema_final.prisma');

let content = fs.readFileSync(inputPath, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

// Ensure first few lines are clean
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

// Find where the rest of the file starts (after the existing generator and datasource blocks)
// We'll just look for the first enum or model
const restOfFile = content.split('\n').slice(14).join('\n');

fs.writeFileSync(outputPath, cleanHeader + '\n' + restOfFile, 'utf8');
console.log('Schema rebuilt cleanly');
