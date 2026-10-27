---
name: setup-matt-pocock-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills."
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Configure the current repository's preferences:

- **Issue tracker**: where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels**: the strings used for the five canonical triage roles
- **Domain docs**: where `GLOSSARY.md` and ADRs live, and the consumer rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

For Local-only mode, read [REPOSITORY-CONFIG.md](./REPOSITORY-CONFIG.md) and use Git and existing file tools to find the main checkout. If this is not yet a Git working tree, ask before initialising one for Local-only mode. No additional runtime or package installation is needed. Project mode retains the original setup process.

## Configuration mode

Keep the mode already used by this repository when rerunning setup. If no preference files exist in either location, ask which mode to use, recommending **Project mode**:

- **Project mode** (original): save preferences under `docs/agents/` and maintain the original pointer in the existing `CLAUDE.md` or `AGENTS.md` file.
- **Local-only mode** (opt-in): save preferences under `..\.skills\<main-checkout-folder-name>\` on Windows or `../.skills/<main-checkout-folder-name>/` on Linux/macOS, relative to the main checkout. Do not edit project files. The consuming skills refer to the shared `REPOSITORY-CONFIG.md` guide; install this setup skill alongside any skill that needs Local-only preferences.

If both locations contain preferences and setup cannot determine the chosen mode, ask which to use. Do not merge or migrate files unless the user explicitly requests it.

In Local-only mode, show the resolved absolute directory before confirmation and after writing, listing the full path of each file written. Setup creates preference files only after the user confirms; installing the skills does not create them.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- The canonical remote: is this a GitHub repo? Which one? Do not confuse a fork with upstream.
- Existing project preferences in `docs/agents/`, and Local-only preferences in the main checkout's sibling `.skills/<main-checkout-folder-name>/`, if present. Reuse user edits when updating setup.
- `AGENTS.md` and `CLAUDE.md` at the repo root: does either exist? Is there already an `## Agent skills` section in either?
- `GLOSSARY.md` and `GLOSSARY-MAP.md` at the repo root, and the legacy `CONTEXT.md` / `CONTEXT-MAP.md`. In Project mode, preserve the original offer to `git mv` legacy artifacts to their `GLOSSARY` names and update `docs/agents/domain.md`. In Local-only mode, leave the artifacts unchanged and record their existing paths in the local domain preferences.
- `docs/adr/` and any `src/*/docs/adr/` directories
- `.scratch/`: a sign that a local-markdown issue tracker convention is already in use
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.
- Monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. These are present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order. One section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the question entirely when exploration already settled it (Section B when `triage` isn't installed, Section C when there's no monorepo).

**Section A: Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it. They need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub**: issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab**: issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown**: issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.): ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `issue-tracker.md` in the resolved configuration directory. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off**. Leave it off and don't raise it: a user who wants external PRs in the triage queue can flip the flag in their local file later.

A GitHub or GitLab tracker needs a reachable repo. When the user picks one and no `git remote` points at that host, get the repo URL from them and wire it up (`git init` if needed, `git remote add origin <url>`) before going further. Done when `gh repo view` / `glab repo view` prints the project from inside this directory; if it can't, stop and tell the user what's missing.

**Section B: Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you), since an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no, usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`), collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C: Domain docs.** Preserve any configured or discovered paths. For a new layout, default to **single-context** (one `GLOSSARY.md` + `docs/adr/` at the repo root). This fits almost every repo; write the preference without asking. Do not create the glossary or ADR directory.

Offer **multi-context** (a root `GLOSSARY-MAP.md` pointing to per-context `GLOSSARY.md` files) only when exploration found monorepo signals. Then confirm which layout they want.

### 3. Confirm

Show the user a draft of:

- The canonical repository and selected mode
- The contents of `issue-tracker.md`, `domain.md`, and `triage-labels.md` (the last when Section B ran), with their exact write paths for the selected mode
- In Project mode, the original `## Agent skills` block for the selected project instruction file (see step 4).

Let them edit before writing.

### 4. Write

Create the selected configuration directory if necessary. Write the preferences under `docs/agents/` in **Project mode**, or the resolved sibling `.skills/<main-checkout-folder-name>/` directory in **Local-only mode**. Update existing preferences without discarding user customisations; do not move or delete the other mode's files unless migration was explicitly requested.

**Project mode: pick the instruction file to edit using the original rules:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create; don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa); always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout: "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Include the `### Triage labels` sub-block, and write `triage-labels.md` in the selected directory, only when `triage` is installed and Section B ran. When it isn't, both are omitted.

**Local-only mode:** leave all repository files unchanged. The consuming skill's guide reference loads preferences when that skill is used. Install this setup skill alongside the consuming skill so its shared guide is available.

When Section B ran on GitHub or GitLab, create each configured label the tracker lacks (`gh label create` / `glab label create`).

Use the seed templates in this skill folder as a starting point for the selected mode's files:

- [issue-tracker-github.md](./issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](./triage-labels.md): label mapping (when Section B ran)
- [domain.md](./domain.md): domain doc consumer rules + layout

For "other" issue trackers, write the local `issue-tracker.md` using the user's description. Store no credentials. Make domain paths explicitly project-relative, including custom layouts discovered in exploration.

### 5. Done

Read the written files to confirm they contain the agreed preferences and report read failures explicitly. Tell the user the selected mode and exact preference paths. They can edit preferences directly later. Local-only preferences are not committed or automatically shared with teammates. Worktrees share the main checkout's Local-only preferences.
