---
"mattpocock-skills": minor
---

Store repository tracker workflows, triage-label mappings and domain-document preferences in user-local configuration keyed by the canonical Git remote. Setup no longer writes instruction-file pointers or `docs/agents/` preferences.

Consumers use a shared cross-platform resolver, with explicit setup-first errors for missing configuration and an absolute `MATT_POCOCK_SKILLS_CONFIG_HOME` override. Clones and worktrees share preferences; forks remain distinct. Existing project preferences can be confirmed and copied during setup without editing legacy files.

Glossaries, ADRs, local tickets and other project artifacts keep their existing output locations. Install setup alongside consumers; the resolver requires Git and Node.js 18 or newer.
