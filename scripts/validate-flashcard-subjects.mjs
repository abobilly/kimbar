import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Valid subjects
const VALID_SUBJECTS = new Set([
  'constitutional-law',
  'contracts',
  'criminal-law',
  'criminal-procedure',
  'evidence',
  'real-property',
  'torts',
  'civil-procedure'
]);

// Helper to load env vars from .env files
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    }
  }
}

// Load environment variables
const rootDir = path.resolve(__dirname, '..');
loadEnv(path.join(rootDir, '.env'));
loadEnv(path.join(rootDir, '.env.local'));

async function main() {
  const args = process.argv.slice(2);
  let url = process.env.VITE_FLASHCARD_API_URL;
  
  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') {
      url = args[i + 1];
      i++;
    }
  }

  let cardsData;

  try {
    if (url) {
      console.log(`Fetching flashcards from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      }
      cardsData = await response.json();
    } else {
      const localPath = path.join(rootDir, 'public', 'content', 'cards', 'flashcards.json');
      console.log(`No URL provided. Reading from local file: ${localPath}`);
      if (!fs.existsSync(localPath)) {
        throw new Error(`File not found: ${localPath}`);
      }
      const fileContent = fs.readFileSync(localPath, 'utf-8');
      cardsData = JSON.parse(fileContent);
    }

    if (!cardsData || !Array.isArray(cardsData.cards)) {
      throw new Error('Invalid data format: Expected object with "cards" array.');
    }

    console.log(`Validating ${cardsData.cards.length} cards...`);

    const orphanSubjects = new Set();
    let errorCount = 0;

    for (const card of cardsData.cards) {
      if (!card.subject) {
        console.error(`Card ${card.id || 'unknown'} missing subject.`);
        errorCount++;
        continue;
      }

      if (!VALID_SUBJECTS.has(card.subject)) {
        orphanSubjects.add(card.subject);
        errorCount++;
        // console.error(`Card ${card.id} has invalid subject: "${card.subject}"`);
      }
    }

    if (orphanSubjects.size > 0) {
      console.error('\nFound orphan subjects (not in allowed list):');
      for (const subject of orphanSubjects) {
        console.error(` - "${subject}"`);
      }
    }

    if (errorCount > 0) {
      console.error(`\nValidation failed with ${errorCount} errors.`);
      process.exit(1);
    } else {
      console.log('\nValidation successful! All subjects are valid.');
      process.exit(0);
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();