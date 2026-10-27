---
name: setup-matt-pocock-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills."
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Configure the current repository's preferences in user-local storage, outside the project:

- **Issue tracker**: where issues live (propose the remote's host, but never silently choose a tracker)
- **Triage labels**: the strings used for the five canonical triage roles
- **Domain docs**: where `GLOSSARY.md` and ADRs live, and the consumer rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

Read [REPOSITORY-CONFIG.md](./REPOSITORY-CONFIG.md) first. If this is not yet a Git working tree, ask before initialising one. Then use the bundled resolver with no config-kind arguments to obtain the repository identity, directory, and file paths. Never write preference files under `docs/agents/` or create/edit `AGENTS.md` / `CLAUDE.md` pointers. Glossaries, ADRs and local tracker artifacts remain in the project.

## Where configuration is saved

The three preference files are `issue-tracker.md`, `triage-labels.md` (when needed), and `domain.md`, saved in this directory:

| Platform | Configuration directory |
| --- | --- |
| Windows | `%LOCALAPPDATA%\matt-pocock-skills\repositories\<key>\` |
| Linux / other Unix | `${XDG_CONFIG_HOME:-$HOME/.config}/matt-pocock-skills/repositories/<key>/` |
| macOS | `~/Library/Application Support/matt-pocock-skills/repositories/<key>/` |

`<key>` is the SHA-256 digest of the canonical repository identity, for example `github.com/mpkarlo/my-skills`, not the checkout folder name. If `LOCALAPPDATA` is unset, Windows uses `%USERPROFILE%\AppData\Local`. The absolute `MATT_POCOCK_SKILLS_CONFIG_HOME` override replaces the platform root; files then live in `<override>/repositories/<key>/`. Use the shared resolver to compute the key and exact paths, not a separate implementation.

Show the resolved absolute directory before confirmation and again after writing, listing the full path of each file written. Do not merely say "user-local configuration". Setup creates these files only after the user confirms; installing the skills does not create preferences.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- The resolver's canonical remote identity: is this a GitHub repo? Which one? Do not confuse a fork with upstream.
- The resolved local configuration files, if present. Reuse user edits when updating setup.
- `AGENTS.md`, `CLAUDE.md`, and legacy `docs/agents/` preferences, read-only, as possible migration input. Present any migration for confirmation, then copy agreed preferences to user storage. Leave existing files and pointers untouched.
- `GLOSSARY.md` and `GLOSSARY-MAP.md` at the repo root, and the legacy `CONTEXT.md` / `CONTEXT-MAP.md`. If legacy artifacts exist, record their actual paths in the local domain config; do not rename project artifacts during preference setup.
- `docs/adr/` and any `src/*/docs/adr/` directories
- `.scratch/`: a sign that a local-markdown issue tracker convention is already in use
- Are `triage`, `to-spec`, or `to-tickets` installed? (folders alongside this one, or in your available skills.) Any of these requires Section B.
- Monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. These are present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order. One section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the question entirely when exploration already settled it (Section B when no role-applying skill is installed, Section C when there's no monorepo).

**Section A: Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it. They need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub**: issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab**: issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown**: issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.): ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in the resolver's `files.tracker` (`issue-tracker.md`). The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off**. Leave it off and don't raise it: a user who wants external PRs in the triage queue can flip the flag in their local file later.

A GitHub or GitLab tracker needs a reachable repo. When the user picks one and no `git remote` points at that host, get the repo URL from them and wire it up (`git init` if needed, `git remote add origin <url>`) before going further. Done when `gh repo view` / `glab repo view` prints the project from inside this directory; if it can't, stop and tell the user what's missing.

If the directory is not yet a Git working tree, ask before initialising it, then resolve again. After wiring or changing a remote, always rerun the resolver before writing preferences, because the key may change. Record the confirmed tracker target explicitly and scope CLI operations to it (`--repo` / API project path) instead of relying on a fork's upstream default. A remote identifies the config; it does not choose the tracker without confirmation.

**Section B: Triage label vocabulary.** Run this section when `triage`, `to-spec`, or `to-tickets` is installed: all three apply triage roles. Otherwise skip it, preserving any existing local mapping.

If any are installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no, usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`), collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C: Domain docs.** Preserve any configured or discovered paths. For a new layout, default to **single-context** (one `GLOSSARY.md` + `docs/adr/` at the repo root). This fits almost every repo; write the preference without asking. Do not create the glossary or ADR directory.

Offer **multi-context** (a root `GLOSSARY-MAP.md` pointing to per-context `GLOSSARY.md` files) only when exploration found monorepo signals. Then confirm which layout they want.

### 3. Confirm

Show the user a draft of:

- The canonical repository identity and resolved user-local directory
- The contents of `issue-tracker.md`, `domain.md`, and `triage-labels.md` (the last when Section B ran), with their exact local paths

Let them edit before writing.

### 4. Write

Create the resolved user-local directory if necessary. Write only `files.tracker`, `files.domain`, and `files.labels` (the last when Section B ran). Update existing local files without discarding unrelated user customisations. Do not edit project instructions or legacy preference files.

When Section B ran on GitHub or GitLab, create each configured label the tracker lacks (`gh label create` / `glab label create`).

Use the seed templates in this skill folder as a starting point for the local files:

- [issue-tracker-github.md](./issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](./triage-labels.md): label mapping (when Section B ran)
- [domain.md](./domain.md): domain doc consumer rules + layout

For "other" issue trackers, write the local `issue-tracker.md` using the user's description. Store no credentials. Make domain paths explicitly project-relative, including custom layouts discovered in exploration.

### 5. Done

Run the resolver requiring `tracker domain` and also `labels` when Section B ran, then read the written files to confirm the agreed preferences. Tell the user the exact local directory and which skills read it. They can edit these files directly later. Configuration is personal, not committed or automatically shared with teammates; each user runs setup. Changing the canonical remote changes the key, so rerun setup or explicitly migrate confirmed preferences to the newly resolved directory.
