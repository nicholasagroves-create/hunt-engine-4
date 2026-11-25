# Task 7 — Configurable app shell
The shell is engine-owned. Adventure config supplies `navigation`, `archiveTabs`, and `shell.transition`. Main navigation and archive tabs are independent. Tabs with `enabled:false` or a disabled `module` are omitted. One archive tab hides its tab strip. Archive tab, selected item, and scroll offsets are saved in the existing local save. Main navigation remembers its last destination. No puzzle attempts are saved.

Home Edition currently uses Archive, Scan, Messages, Finale and Characters/Journal/Inventory. Scan is prominent but camera scanning is **not** implemented. The puzzle-screen preview demonstrates the engine-owned fixed Exit area only; no puzzle is unlocked or completed.

Onboarding gate: an enabled onboarding with no required tutorial has a Start Adventure action. If a tutorial is required, the gate remains locked until the Phase 2 tutorial runner exists; no bypass is allowed. The original 3.0 app is a sequencing reference only, not a dependency. The app is not NatGeo-branded.

Phase 2 must replace placeholder scanner and puzzle previews, connect tutorial flow, and implement adventure-directed navigation. Screen-level animation overrides and specialized archive renderers remain future work; current Task 7 supports the default fade/none setting and configurable tab templates.
