# Local-only repository preferences

This guide describes the optional Local-only configuration mode. A repository-level app instruction points here for the selected repository; individual skills do not need resolver instructions. Reading this reference does not invoke the user-only setup skill. When no Local-only preferences exist, follow the original project-level setup and each skill's existing behavior.

## Repository-level app reference

For Local-only mode, add the following block to the Copilot App's repository-level Instructions setting, replacing the placeholder with the absolute path of this installed guide. Do not put it in app-level instructions or the project's `AGENTS.md` or `CLAUDE.md`. Setup presents the exact text and asks the user to add it, preserving unrelated instructions. Configure each repository separately; a configuration folder alone is not automatically discovered.

```markdown
## Matt Pocock skills: local repository preferences

For this repository, before using Matt Pocock's engineering skills, check for Local-only
preferences using the shared guide at
`<absolute installed setup-matt-pocock-skills path>/REPOSITORY-CONFIG.md`.
Load preferences again when changing repositories. If none are present,
continue with the project's instructions and the skills' existing
behavior. Pass this instruction and the project directory to subagents.
```

Use a stable installed skill path, not a temporary implementation worktree. In another app, use an equivalent repository-scoped instruction setting if available. Otherwise, load this guide manually and report that automatic discovery is unavailable; do not edit project instructions or duplicate the block into skills. This is an instruction-based lookup, not an operating-system alias: it does not redirect literal filesystem reads by external scripts.

## Session-level loading rules

Use Git and the agent's existing shell and file tools to locate Local-only preferences from the current project, once before using the engineering skills. No Node.js, package installation, or bundled executable is needed.

- Check the resolved Local-only directory and the current project's `docs/agents/` for the three preference files listed below. An empty directory or unrelated files do not establish a mode. If both locations contain preferences and no mode has been selected for this session, ask which to use. Do not merge them or silently override either.
- If Local-only mode is selected, read its available preference files and pass their content into the session so skills can use the configured tracker, label names, or domain-document paths. If Project mode is selected or no Local-only preferences exist, follow the project's instructions and each skill's existing behavior.
- Missing preferences retain each skill's original setup guidance and fallbacks in either mode. This guide changes preference discovery, not tracker or label behavior.
- If a preference file exists but cannot be read, report its exact path and the read error. Do not silently treat an unreadable file as absent.
- If `domain.md` is absent, retain the original conventions: root `GLOSSARY.md`, root `GLOSSARY-MAP.md` when present, and relevant `docs/adr/` directories. Missing domain artifacts are normal.

Pass the selected mode, the project directory, and any preference paths to subagents, including fresh worktrees. Re-resolve when switching repositories. Do not create symlinks, move glossaries or ADRs, or change project output paths to implement this indirection. Explicit project/user instructions take precedence over preferences; report conflicts rather than overriding them.

## Resolve the main checkout

Run `git rev-parse --show-toplevel`, `git rev-parse --git-dir`, and `git rev-parse --git-common-dir` from the current project. Resolve relative results against that working directory and resolve filesystem links before comparing them. Report command failures. Outside a Git working tree, Local-only discovery is unavailable; leave the original project and skill behavior unchanged. Setup asks before initialising Git for Local-only mode.

If the resolved Git directory and common directory are equal, use the project root as the main checkout, including repositories with separately stored Git metadata. Otherwise use the first `worktree` entry from `git worktree list --porcelain -z`; parse NUL-delimited entries so spaces and quoted paths are handled correctly. If that entry is bare or has no usable checkout, report the unsupported layout rather than guessing a parent. Linked worktrees use this main checkout, not their own parent directory or the installed skill location.

Local-only preferences live in the main checkout's sibling `.skills` directory, inside a child with the main checkout's folder name:

| Platform | Configuration directory, relative to the main checkout |
| --- | --- |
| Windows | `..\.skills\<main-checkout-folder-name>\` |
| Linux / macOS | `../.skills/<main-checkout-folder-name>/` |

Preferences live directly in that directory:

- `issue-tracker.md`: tracker workflow, target repository, and PR request-surface flag
- `triage-labels.md`: canonical-role mapping
- `domain.md`: domain-document locations and consumer rules

Read the preference files in that directory when Local-only mode is selected. Resolve again when switching repositories or worktrees. Pass the current project directory and this resolution contract to subagents; never use the installed skills repo as the target tracker. Worktrees share their main checkout's configuration. Moving or renaming the main checkout changes the Local-only path; changing its remote does not. No remote-derived key, hash or configuration-root override is used.

## Missing configuration and migration

If this reference is unavailable, install setup and repair the repository-level app reference. Missing Local-only preferences do not change the original project mode or individual skill behavior. Setup can offer migration from `docs/agents/` to Local-only mode, but only after explicit confirmation. Leave project preferences and instruction pointers untouched unless the user explicitly requests migration or removal. Do not copy tokens or credentials into preferences.

## Preferences are not project artifacts

Paths inside preferences are relative to the current project root, not the config directory. Read domain documents at the configured locations before exploring or writing domain terms. In consumer prose, `GLOSSARY.md`, `GLOSSARY-MAP.md`, and `docs/adr/` stand for the corresponding configured project paths.

For the local-markdown tracker, `.scratch/` is also relative to the current project root; references to the label mapping mean `triage-labels.md` in the selected configuration directory.

Keep glossaries, ADRs, specs, tickets, research outputs and other generated artifacts in their existing project locations. Once a layout is configured, missing glossary/ADR artifacts are normal: create them lazily as before.
