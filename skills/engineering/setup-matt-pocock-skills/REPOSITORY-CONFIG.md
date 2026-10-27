# Local-only repository preferences

This guide describes the optional Local-only mode. Project mode remains the default and keeps its existing `docs/agents/` files, instruction pointers, and skill behavior. It adds no runtime or package dependency.

## Discover Local-only preferences

Skills that consume repository preferences link to this guide. Follow it before using tracker, triage-label, or domain-document preferences. Resolve the mode once per repository and session, and pass the selected mode and preference contents to subagents.

Use Git and existing file tools to find the current project root with `git rev-parse --show-toplevel`. Resolve the output to an absolute path. If Git cannot resolve the current project, Local-only preferences are unavailable; keep using Project mode and the skill's existing behavior.

For a normal working tree, the project root is the main checkout, including when its Git metadata is stored separately. For a linked worktree, use the first checkout entry from `git worktree list --porcelain -z` as the main checkout. Resolve relative Git paths against the current directory and filesystem links before comparing them. Check command failures; do not guess a checkout path.

Local-only preferences live beside the main checkout, in a hidden `.skills` directory named after that checkout:

| Platform | Configuration directory, relative to the main checkout |
| --- | --- |
| Windows | `..\.skills\<main-checkout-folder-name>\` |
| Linux / macOS | `../.skills/<main-checkout-folder-name>/` |

The directory may contain:

- `issue-tracker.md`: tracker workflow, target repository, and PR request-surface preference
- `triage-labels.md`: canonical-role mapping
- `domain.md`: domain-document locations and consumer rules

An empty directory or unrelated files do not select a mode. Check for these named preference files in the Local-only directory and in the current project's `docs/agents/`:

- Only project preferences exist: use Project mode and preserve the original behavior.
- Only Local-only preferences exist: use Local-only mode and read the available files into session context.
- Both locations contain preferences: ask which mode to use for this session. Do not merge or silently override either. Reuse the user's selection for the rest of the session.
- Neither location contains preferences: use the skill's original setup guidance and fallbacks. Do not impose new setup requirements.

Missing preferences retain each skill's original behavior in either mode. This guide changes preference discovery, not tracker or label behavior. If a selected preference file exists but cannot be read, report its exact path and read error rather than treating it as absent. An absent `domain.md` keeps the conventional root `GLOSSARY.md`, root `GLOSSARY-MAP.md` when present, and relevant `docs/adr/` paths.

## Apply domain paths

All paths recorded in `domain.md` are relative to the current project root, not to the configuration directory. Use configured glossary, map, and ADR paths in place of conventional paths when reading or writing domain documents. If no domain preferences are present or selected, preserve the skill's existing paths and artifact behavior. For the local-markdown tracker, `.scratch/` is also relative to the current project root; references to the label mapping mean `triage-labels.md` in the selected configuration directory.

Changing the main checkout folder name or its parent changes the Local-only path. Linked worktrees continue to use their main checkout's directory. No remote-derived key, hash, environment-variable override, symlink, artifact move, or output-path change is used. External programs that read literal paths are not redirected by this guide.

Keep glossaries, ADRs, specs, tickets, research outputs, and other generated artifacts in their existing project locations. Missing domain artifacts remain normal; create them lazily as before.
