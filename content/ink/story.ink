// Kim Bar - Main Story
// Compiled with: npm run compile:ink
//
// Tag Reference:
//   speaker:Name           - Set speaker name in dialogue box
//   portrait:id            - Set portrait image (e.g., portrait:npc.clerk_01)
//   portrait:id:emotion    - Set portrait with emotion (e.g., portrait:npc.clerk_01:happy)
//   sfx:sound_name         - Play sound effect
//   quest:set flag=value   - Set a story flag
//   quest:get flag         - Log flag value (debug)
//   encounter:deckTag=X count=N rewardId=Y  - Start encounter
//   give:item_id           - Give item/outfit
//   save                   - Save game
//
// NOTE: Dialogue is split across multiple compiled JSON files:
//   - story.json (this file): clerk intro, basic interactions
//   - justices.json: justice intro/victory/defeat knots
//   - tutorial.json: librarian, bailiff, reporter dialogues
//   - rewards.json: outfit acquisition dialogues
// The game loads each JSON file separately.

=== court_clerk_intro ===
# speaker:Court Clerk
# portrait:npc.clerk_01
# sfx:paper_shuffle
Welcome to the Supreme Court, counselor. Are you here to suffer… I mean, study?
*   [Yes. Hit me.] -> clerk_ready
*   [Not today.] -> clerk_later

=== clerk_ready ===
# speaker:Court Clerk
# portrait:npc.clerk_01
# quest:set court_intro=true
Excellent! The Justices await in their chambers. Each one guards a domain of legal knowledge.
# sfx:gavel_tap
Defeat them in flashcard combat to earn powerful outfits. Good luck, counselor.
-> END

=== clerk_later ===
# speaker:Court Clerk
# portrait:npc.clerk_01
Take your time. The law isn't going anywhere... unfortunately.
-> END

=== clerk_intro ===
// Alias for backwards compatibility
-> court_clerk_intro

=== evidence_challenge ===
# speaker:Court Clerk
# portrait:npc.clerk_01
Ready to test your knowledge of Evidence?
*   [Bring it on!]
    # encounter:deckTag=evidence count=3 rewardId=evidence_blazer
    -> END
*   [Not yet...]
    Come back when you're ready.
    -> END
