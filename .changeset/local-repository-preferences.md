---
"mattpocock-skills": minor
---

Add optional Local-only storage for repository tracker workflows, triage-label mappings and domain-document preferences. Project mode remains the default, using the original `docs/agents/` preferences and project instruction pointers.

Local-only preferences live in `../.skills/<main-checkout-folder-name>/`, relative to the main checkout. Worktrees share those preferences. Setup preserves the existing mode on reruns and asks before switching or migrating; it does not edit project files in Local-only mode.

A repository-level app instruction references one shared guide to load Local-only preferences without per-skill lookup changes, hashes, environment-variable overrides or an additional runtime dependency. Missing preferences retain each skill's original setup guidance and fallbacks.

Glossaries, ADRs, local tickets and other project artifacts keep their original locations. Project mode retains its offer to rename legacy context artifacts; Local-only mode records their existing paths instead.
