# Phase 2 Task 2 — opening sequence controller, first integration

Config-driven opening cards: access, studio, sponsor, title, narrative, optional tutorial steps, launch. Studio/sponsor/narrative skippable; title explicit manual continue; access name required. Durable progress per card, and resumption after closing/reopening. Existing sessions can preview sequence via Replay opening without changing achievements or resetting saves. First-time incoming QR code is held for a post-onboarding rescan prompt. Opening content is deliberately neutral engine test content in Home Edition packet, not the client story or skin.

**Important limitation:** A required tutorial puzzle is a hard gate until the Phase 2 puzzle controller implements it. The current Home Edition test configuration has tutorial disabled, so all six implemented opening stages can be tested now. Do not mark tutorial completed via the opening controller. This is not yet a complete seven-stage interactive tutorial.

Testing: Existing users tap Replay opening in topbar and advance through six cards; preview is non-mutating. New local saves encounter the same sequence with persistent progress. Onboarding completion is saved only on launch. Current manual QR and scanner routing should remain unaffected.
