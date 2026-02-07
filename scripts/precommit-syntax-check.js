import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);  // this fixes __filename in ESM

console.log('Running pre-commit checks...');

let hasError = false;

// 1. Syntax check
function checkSyntax() {
  console.log('→ Checking JavaScript syntax...');

  const files = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!fullPath.includes('node_modules')) walk(fullPath);
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    });
  };

  walk('.');

  if (files.length === 0) {
    console.log('  No .js files found.');
    return;
  }

  files.forEach(filePath => {
    try {
      execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
      console.log(`  ✔ ${filePath}`);
    } catch (err) {
      console.error(`  ✘ ${filePath}`);
      console.error(`     ${err.message.trim()}`);
      hasError = true;
    }
  });
}

// 2. .env check
function checkEnv() {
  console.log('→ Checking required .env variables...');

  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error('  ✘ .env file not found');
    hasError = true;
    return;
  }

  dotenv.config({ path: envPath });

  const requiredKeys = [
    'TELEGRAM_BOT_TOKEN',
    'OPENAI_API_KEY',
    // Add your real keys here
  ];

  requiredKeys.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === '') {
      console.error(`  ✘ Missing or empty: ${key}`);
      hasError = true;
    } else {
      console.log(`  ✔ ${key} is set`);
    }
  });
}

// 3. No console statements (ignore this script itself)
function checkNoConsole() {
  console.log('→ Checking for leftover console statements...');

  const thisScript = path.resolve(__filename);
  const files = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!fullPath.includes('node_modules')) walk(fullPath);
      } else if (entry.name.endsWith('.js') && fullPath !== thisScript) {
        files.push(fullPath);
      }
    });
  };

  walk('.');

  let found = false;

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (
        trimmed.includes('console.log(') ||
        trimmed.includes('console.warn(') ||
        trimmed.includes('console.error(')
      ) {
        if (!trimmed.startsWith('//') && !trimmed.includes('//')) {
          console.warn(`  ⚠️ console found in ${filePath}:${index + 1}`);
          console.warn(`     ${line.trim()}`);
          found = true;
        }
      }
    });
  });

  if (found) {
    console.warn('\nRemove console statements before committing.');
    hasError = true;
  } else {
    console.log('  No console statements found — good');
  }
}

// Run all checks
checkSyntax();
checkEnv();
checkNoConsole();

if (hasError) {
  console.error('\nCommit blocked — fix the issues.');
  process.exit(1);
}

console.log('\nAll checks passed!');
process.exit(0);
