#!/usr/bin/env node
/**
 * validate-flashcard-subjects.mjs
 * Validates that flashcard subjects from the Worker API match registry_config.json
 *
 * Usage: node scripts/validate-flashcard-subjects.mjs
 *
 * Requirements:
 *   - VITE_FLASHCARD_API_URL env var OR uses default endpoint
 *   - content/registry_config.json must exist
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Default API URL (can be overridden by env var)
// Note: The API path is /flashcards, not just the base URL
const FLASHCARD_API_URL =
    process.env.VITE_FLASHCARD_API_URL ||
    "https://flashcard-api.andrewsbadger.workers.dev/flashcards";

async function main() {
    console.log("🔍 Validating flashcard subjects against registry...\n");

    // Load registry_config.json
    const registryPath = path.join(ROOT, "content", "registry_config.json");
    let registry;
    try {
        const registryData = await fs.readFile(registryPath, "utf-8");
        registry = JSON.parse(registryData);
    } catch (err) {
        console.error(`❌ Failed to load registry_config.json: ${err.message}`);
        process.exit(1);
    }

    // Extract valid subjects from registry (supports both flat array and tags.subjects)
    const subjectsArray = registry.tags?.subjects || registry.subjects || [];
    const validSubjects = new Set(
        subjectsArray.map((s) => (typeof s === "string" ? s : s.id))
    );
    console.log(`📚 Registry subjects (${validSubjects.size}):`, [...validSubjects].join(", "));

    // Fetch flashcards from Worker API
    console.log(`\n🌐 Fetching flashcards from: ${FLASHCARD_API_URL}`);
    let flashcards;
    try {
        const response = await fetch(FLASHCARD_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        flashcards = await response.json();
    } catch (err) {
        console.error(`❌ Failed to fetch flashcards: ${err.message}`);
        process.exit(1);
    }

    // Handle different response formats
    const cards = Array.isArray(flashcards) ? flashcards : flashcards.flashcards || [];
    console.log(`📝 Received ${cards.length} flashcards\n`);

    // Collect all subjects from flashcards
    const flashcardSubjects = new Map(); // subject -> count
    const unknownSubjects = new Map(); // subject -> example cards

    for (const card of cards) {
        const subjects = card.tags?.subjects || [];
        for (const subject of subjects) {
            flashcardSubjects.set(subject, (flashcardSubjects.get(subject) || 0) + 1);

            if (!validSubjects.has(subject)) {
                if (!unknownSubjects.has(subject)) {
                    unknownSubjects.set(subject, []);
                }
                if (unknownSubjects.get(subject).length < 3) {
                    unknownSubjects.get(subject).push(card.id || card.question?.substring(0, 50));
                }
            }
        }
    }

    // Report results
    console.log("📊 Subject distribution in flashcards:");
    const sortedSubjects = [...flashcardSubjects.entries()].sort((a, b) => b[1] - a[1]);
    for (const [subject, count] of sortedSubjects) {
        const valid = validSubjects.has(subject) ? "✅" : "❌";
        console.log(`  ${valid} ${subject}: ${count} cards`);
    }

    // Check for missing subjects (in registry but not in flashcards)
    const missingSubjects = [...validSubjects].filter(
        (s) => !flashcardSubjects.has(s)
    );
    if (missingSubjects.length > 0) {
        console.log(`\n⚠️  Subjects in registry with no flashcards (${missingSubjects.length}):`);
        for (const subject of missingSubjects) {
            console.log(`  - ${subject}`);
        }
    }

    // Report unknown subjects
    if (unknownSubjects.size > 0) {
        console.log(`\n❌ Unknown subjects (${unknownSubjects.size}) - not in registry:`);
        for (const [subject, examples] of unknownSubjects) {
            console.log(`  - ${subject} (examples: ${examples.join(", ")})`);
        }
        console.log("\n💡 Add these to content/registry_config.json subjects array.");
        process.exit(1);
    }

    console.log("\n✅ All flashcard subjects are valid!");

    // Check character-subject coverage
    console.log("\n🎭 Checking character-subject coverage...");
    const characterDir = path.join(ROOT, "content", "characters");
    const characterFiles = await fs.readdir(characterDir).catch(() => []);

    const characterSubjects = new Set();
    for (const file of characterFiles) {
        if (!file.endsWith(".json")) continue;
        try {
            const charData = await fs.readFile(path.join(characterDir, file), "utf-8");
            const char = JSON.parse(charData);
            const subjects = char.metadata?.subjects || [];
            subjects.forEach((s) => characterSubjects.add(s));
        } catch {
            // Skip invalid files
        }
    }

    // Check which subjects have characters
    const subjectsWithCharacters = [...validSubjects].filter((s) =>
        characterSubjects.has(s)
    );
    const subjectsWithoutCharacters = [...validSubjects].filter(
        (s) => !characterSubjects.has(s)
    );

    console.log(`  ✅ Subjects with characters (${subjectsWithCharacters.length}): ${subjectsWithCharacters.join(", ")}`);
    if (subjectsWithoutCharacters.length > 0) {
        console.log(`  ⚠️  Subjects without characters (${subjectsWithoutCharacters.length}): ${subjectsWithoutCharacters.join(", ")}`);
    }

    // Final summary
    console.log("\n📋 Summary:");
    console.log(`  - Total flashcards: ${cards.length}`);
    console.log(`  - Unique subjects in flashcards: ${flashcardSubjects.size}`);
    console.log(`  - Subjects in registry: ${validSubjects.size}`);
    console.log(`  - Characters with subjects: ${characterSubjects.size}`);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
