# Hunt Engine 4.0 — Architecture decisions

## Puzzle isolation (approved 2026-11-26)

- The engine is a generic host. It discovers and launches registered puzzles, handles navigation, chapters, journals, characters/shelves, inventory rewards, transmissions, finale, and durable completion.
- Every puzzle owns its UI, assets, interaction, internal logic, and answer validation. The engine must NOT need to recognize puzzle mechanic types or inspect their solutions.
- Puzzles communicate through a small, stable lifecycle/completion interface. Completion is reported to the engine, which awards configured rewards and advances the story atomically and idempotently. Puzzle code must not write story/inventory state.
- Puzzles are independently implementable modules, potentially isolated in frames when appropriate. The puzzle library contains reusable source templates/starter puzzles for creators; it is NOT an engine-interpreted catalog of mechanics.
- Acceptance test: register and run a brand-new puzzle without changing engine source.
- **No unfinished puzzle save state.** Closing, abandoning, navigating away from, or restarting an incomplete puzzle discards its local progress. Every new launch begins at the puzzle's initial state. The engine persists only durable completion, rewards, and story state. Completed puzzle replays also start from the beginning and cannot re-award rewards.
- Existing mechanic-specific dispatch (e.g., compass-rotation vs answer-entry) is transitional and should be replaced by the universal puzzle host contract. Do not add more mechanic-specific dispatch to the engine.

## Content responsibilities

- Story packet: seven chapters, one completion per chapter (tutorial, five freely ordered main puzzles, finale); variable-length opening/closing journal arrays; active chapter determines shelf/character, not puzzle identity.
- Puzzle packet: five discovery scanner codes and independent puzzle modules; each main puzzle awards one permanent inventory fragment. Completion order may vary; fragment reward stays with its puzzle.
- Transmission packet: observatory map displaying all five codes, plus story-triggered transmissions as configured.
- Finale configuration: persistent bottom-right entry point, five inventory fragments entered in riddle-defined order, then chapter seven completion and ending.
- The Lost Observatory is a small but real end-to-end test adventure, separate from engine source.

## Lost Observatory agreed test flow

Seven opening screens -> Chapter 1 opening journal automatically opens before Archive reveal -> compass tutorial -> Chapter 1 closing journal -> Archive reveal -> character tile flashes then profile auto-opens (teaching shelf behavior) -> transmissions/scanner instructions -> open play. Subsequent chapters unlock configured journal groups and character shelf placements.

Five inventory fragments: LIGHT, NORTH, SEVEN, ECHO, DAWN. Finale riddle (user-approved wording):
> Last is what comes after darkness, the seas arrive before the sound returns, you see by the start which comes just before the star.

Correct sequence: LIGHT -> NORTH -> SEVEN -> ECHO -> DAWN. Fragment order of acquisition is independent of finale order. The fragments are permanent, not consumed.

## Test acceptance

- Vary opening/closing journal counts per chapter; opening/closing groups unlock without overwriting prior entries.
- Solve five main puzzles in differing orders; active chapter receives the completion tile, puzzle retains its own inventory reward.
- Character reveal flashes and automatically opens the character profile; repeated character shelves accumulate tiles.
- Scanner map codes launch the correct independent puzzles.
- Verify completion persistence and replay idempotence; abandon an incomplete puzzle and confirm fresh restart.
- Finale validates five-fragment order, completes final chapter, and shows ending.

These are design requirements, not a claim that current engine code already implements them.
