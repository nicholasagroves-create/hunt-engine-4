# Phase 2 Archive shelf tiles and replay

Character pages render `save.characters.tiles` assignments, not predefined puzzle ownership. The shelf receives whichever first-time eligible puzzle closed its chapter. Each tile opens its puzzle in replay mode with a blank answer; solving a replay does not call the story controller or mutate durable progress. Exiting abandons only the in-memory replay. Scanning an already completed code offers Replay puzzle. Existing save assignments remain intact.

Test with existing completed story chapters: open each character and verify their assigned puzzle tiles. Tap a tile, enter a wrong answer, exit and reopen to verify blank input, solve and verify no additional chapters/rewards, then close and reopen the PWA to confirm placement persists. Note: existing saves without `characters.tiles` cannot have historic puzzle-to-shelf assignments reconstructed safely; no guessing/backfill. Story side effects atomicity remains separate production hardening work.
