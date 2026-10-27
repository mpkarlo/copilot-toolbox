---
"mattpocock-skills": minor
---

Store repository tracker workflows, triage-label mappings and domain-document preferences in user-local configuration keyed by the canonical Git remote. Setup no longer writes instruction-file pointers or `docs/agents/` preferences.

Consumers use a shared guide with Git and existing OS tools, with explicit setup-first errors for missing configuration and an absolute `MATT_POCOCK_SKILLS_CONFIG_HOME` override. Preferences live in a visible sibling `skill-config/<owner>-<repo>-<short-hash>/` folder beside the main checkout. Worktrees share preferences; clones share when their parent directories or override roots match, while forks remain distinct. Existing project preferences can be confirmed and copied during setup without editing legacy files.

Glossaries, ADRs, local tickets and other project artifacts keep their existing output locations. Configuration discovery adds no runtime or package dependency.

One user-level bootstrap block per harness loads the shared guide into sessions, replacing repeated per-skill resolver requirements. Domain preferences are optional and conventional project glossary/ADR lookups remain available without setup. Tracker and triage-label operations still require explicit configuration; wayfinder no longer guesses local markdown when it is absent.
