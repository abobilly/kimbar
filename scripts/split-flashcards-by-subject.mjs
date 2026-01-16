#!/usr/bin/env node
// Split flashcards.json into subject-specific packs

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = path.join(__dirname, '../public/content/cards');
const SOURCE_FILE = path.join(CARDS_DIR, 'flashcards.json');

// Subject normalization mapping (for filenames and IDs)
const SUBJECT_MAPPINGS = {
  'Agency': 'agency',
  'Civil Procedure': 'civil_procedure',
  'Con Law': 'constitutional_law',
  'Conflicts Of Law': 'conflicts',
  'Contracts': 'contracts',
  'Corporations': 'corporations',
  'Criminal Law': 'criminal_law',
  'Criminal Procedure': 'criminal_procedure',
  'Evidence': 'evidence',
  'Family Law': 'family_law',
  'Partnerships': 'partnerships',
  'Real Property': 'property',
  'Secured Transactions': 'secured_transactions',
  'Torts': 'torts',
  'Trusts And Estates': 'trusts_estates',
  'MPT': 'mpt'
};

async function main() {
  console.log('Loading flashcards from', SOURCE_FILE);
  
  // Load source data
  const sourceData = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8'));
  const { cards, source, version, totalCards } = sourceData;
  
  if (!cards || !Array.isArray(cards)) {
    throw new Error('Invalid flashcards.json format: missing cards array');
  }
  
  console.log(`Found ${cards.length} cards`);
  
  // Group by subject
  const bySubject = {};
  for (const card of cards) {
    const subject = card.subject || 'Unknown';
    if (!bySubject[subject]) {
      bySubject[subject] = [];
    }
    bySubject[subject].push(card);
  }
  
  // Write subject-specific packs
  const packs = [];
  for (const [subject, subjectCards] of Object.entries(bySubject).sort()) {
    const normalizedId = SUBJECT_MAPPINGS[subject] || subject.toLowerCase().replace(/\s+/g, '_');
    const filename = `${normalizedId}.json`;
    const filepath = path.join(CARDS_DIR, filename);
    
    const pack = {
      schemaVersion: 1,
      id: normalizedId,
      title: subject,
      description: `${subject} flashcards for bar exam prep`,
      source: source || 'bar-flashcards-docx',
      version: version || '2025-11-22',
      count: subjectCards.length,
      cards: subjectCards
    };
    
    await fs.writeFile(filepath, JSON.stringify(pack, null, 2), 'utf8');
    console.log(`✓ ${filename} (${subjectCards.length} cards)`);
    
    packs.push({
      id: normalizedId,
      title: subject,
      count: subjectCards.length,
      url: `/content/cards/${filename}`
    });
  }
  
  // Write manifest
  const manifestPath = path.join(CARDS_DIR, '_manifest.json');
  const manifest = {
    version: version || '2025-11-22',
    source: source || 'bar-flashcards-docx',
    totalCards: cards.length,
    packs: packs.sort((a, b) => a.id.localeCompare(b.id))
  };
  
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n✓ _manifest.json (${packs.length} packs)`);
  console.log(`\nTotal: ${cards.length} cards across ${packs.length} subjects`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
