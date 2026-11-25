# Phase 2 / Task 1: QR discovery scanner

Camera starts when Scan is tapped, using the native BarcodeDetector API on supported browsers. If the browser does not support it or permission is denied, the five-character manual code entry remains available. Both inputs share a single parser and resolver. Camera tracks are stopped when exiting the scanner, entering manual mode, or leaving the page. No third-party CDN or camera footage storage.

Test fixture: Home Edition code **H4DEV** resolves to `home-scanner-test`, a nonrewarding placeholder puzzle. The fixture is for end-to-end routing verification only and should be replaced when real Home Edition puzzles are authored. Its URL is `https://nicholasagroves-create.github.io/hunt-engine-4/?code=H4DEV&game=home-edition`. Printable QR/PDF generation is a separate follow-on task.

QR URLs require same origin and path, with optional matching game query. Invalid and unknown codes do not unlock content. All puzzles with prerequisites are conservatively locked until Phase 2 prerequisite controller. Previously completed puzzles can be revisited without duplicate rewards. Scanner does not complete puzzles. Onboarding gate is not bypassed by an external QR; pending code is stored for later onboarding processing.
