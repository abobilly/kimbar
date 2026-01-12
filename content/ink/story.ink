// Kim Bar - Main Story
// Compiled with: npm run compile:ink

=== court_clerk_intro ===
Court Clerk: Welcome. Are you here to suffer… I mean, study?
*   [Yes. Hit me.] -> clerk_ready
*   [Not today.] -> clerk_later

=== clerk_ready ===
Court Clerk: Excellent! The Justices await in their chambers. Each one guards a domain of legal knowledge.
Court Clerk: Defeat them in flashcard combat to earn powerful outfits. Good luck, counselor.
-> END

=== clerk_later ===
Court Clerk: Take your time. The law isn't going anywhere... unfortunately.
-> END

=== clerk_intro ===
// Alias for backwards compatibility
-> court_clerk_intro
