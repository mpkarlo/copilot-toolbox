## What it does

`setup-matt-pocock-skills` answers three questions about one repo: where issues live, what the triage labels are called, and where the domain docs sit. It records the answers as markdown files under `docs/agents/` by default. Optional **Local-only mode** saves those same preferences outside the repository instead.

Those files are the only thing that varies between repos. The skills themselves keep their original behavior. Project mode uses `docs/agents/`; in Local-only mode, each consumer reads a short reference to one shared guide, which finds preferences outside the repository. That is why the set is not tied to GitHub, and why you never edit a skill file to point it at another tracker.

It is a prompt-driven skill, not a deterministic script. It reads your `git remote`, `CLAUDE.md` and `GLOSSARY.md`, proposes what it found, and waits for you to confirm before it writes anything.

## When to reach for it

You invoke this by typing `/setup-matt-pocock-skills`; the [agent](https://www.aihero.dev/ai-coding-dictionary/agent) won't reach for it on its own. Its metadata marks it non-invokable on purpose, so no other skill can fire it for you.

Reach for it once per repo, before the first use of any other engineering skill. If [triage](https://aihero.dev/skills-triage), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets) or [wayfinder](https://aihero.dev/skills-wayfinder) start guessing where your issues go, or apply labels your tracker doesn't have, this repo has not been set up yet. You can run it in a repo halfway through a project. The skill reads what is already there, so no earlier work is lost.

## Prerequisites

**Project mode** is the original default. It writes into the repo you run it in:

| It writes | Where |
| --- | --- |
| `issue-tracker.md` | `docs/agents/` |
| `domain.md` | `docs/agents/` |
| `triage-labels.md` | `docs/agents/`, only when the `triage` skill is installed |
| An `## Agent skills` block | whichever of `CLAUDE.md` or `AGENTS.md` already exists |

You commit those files as markdown so the team shares the preferences. Existing Project-mode setups continue working without migration.

## Optional Local-only mode

Choose Local-only mode to keep this checkout's preferences out of source control without changing project instructions. The same three preference files go in a sibling folder:

| Platform | Configuration directory, relative to the main checkout |
| --- | --- |
| Windows | `..\.skills\<main-checkout-folder-name>\` |
| Linux / macOS | `../.skills/<main-checkout-folder-name>/` |

Git identifies the main checkout so linked worktrees share its preferences. This uses existing tools, not an additional runtime, hash or configuration-root override. Setup reports the exact preference paths before confirmation and after saving. The files are specific to this checkout, not universal settings across projects. Local-only mode requires a Git working tree; if Git is unavailable, the original Project mode remains available.

Each preference-consuming skill has one short, app-agnostic reference to the shared guide. Install `setup-matt-pocock-skills` alongside any consumer that needs Local-only preferences. No app-specific setting or persistent global instruction is required. The guide is instruction-based; it does not redirect literal filesystem reads by external programs.

Rerunning setup preserves the existing mode. Switching or migrating requires confirmation; when both locations contain preferences, the guide asks which to use rather than merging them. Missing preferences retain each skill's original setup guidance and fallbacks; read errors are reported. Glossaries, ADRs and local tickets remain project artifacts. Project mode retains its offer to rename legacy `CONTEXT` artifacts; Local-only mode records their existing paths instead.

## The three decisions

It starts each section with the recommended answer, and skips any question its exploration already answered. Most runs need only two confirmations.

| Decision | What it proposes | When it asks |
| --- | --- | --- |
| **Issue tracker** | the one matching your `git remote` | always, because this is the one real choice |
| **Triage labels** | keep the five canonical names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) | only if the `triage` skill is installed |
| **Domain docs** | single-context: one `GLOSSARY.md` plus `docs/adr/` at the root | only if it spots monorepo signals, and then it offers a multi-context `GLOSSARY-MAP.md` |

The tracker options:

| Option | Where issues live | Needs |
| --- | --- | --- |
| **GitHub** | the repo's GitHub Issues | the `gh` CLI |
| **GitLab** | the repo's GitLab Issues | the `glab` CLI |
| **Local markdown** | files under `.scratch/<feature>/` in this repo | nothing in Project mode; Local-only discovery needs a Git working tree |
| **Other** | wherever you say | one paragraph from you describing the workflow |

The first three ship as templates in the skill and work out of the box. Local markdown is a full option, not a fallback. The skill supports a solo project with no remote. One caveat: don't use local markdown if you use GitHub. They are alternatives, so pick one.

"Other" is a full option too. It is how Jira, Linear, Azure DevOps and Beads all work. You describe the workflow, the skill records your prose in `issue-tracker.md` in the selected mode's directory, and the downstream skills follow the prose. Users have already built this: a Jira-over-[MCP](https://www.aihero.dev/ai-coding-dictionary/mcp) variant, a Gitea CLI shaped like `gh`, a hand-built local dashboard.

## Common questions

**Do I have to use GitHub?**

No. GitHub, GitLab and local markdown under `.scratch/` all ship as ready-made templates, and anything else works through the "other" path. This is the most-repeated question, in roughly these words: *"hard locked to github"*, *"can I use GitLab / Jira"*, *"what about Azure DevOps"*. The answer is always the same: setup chooses the tracker, not the skill.

**Do I need to re-run it after updating the skills?**

The direct answer after v1.1 was yes. The skill's own closing message is softer. It tells you to re-run only to switch trackers or start over. Both are defensible. The seed templates change between versions, so a `docs/agents/issue-tracker.md` from an older release can go out of date against the skills that now read it. If a downstream skill does something different from what the docs describe, re-run setup. It is cheap. Local-only mode refreshes its own preferences without changing the selected mode.

**It wrote to `CLAUDE.md`, but I'm on Codex.**

In Project mode, this is a known gap, and still open. The file-selection rule is "edit `CLAUDE.md` if it exists, else `AGENTS.md`". It checks which file exists, not which harness is running. In a repo with a `CLAUDE.md` left over from Claude Code, the skill writes its `## Agent skills` block to a file Codex never reads. Users have two workarounds: move the block to `AGENTS.md` by hand, or keep `AGENTS.md` canonical and make `CLAUDE.md` a one-line pointer at it. If neither file exists, the skill asks you which to create instead of picking one. This has confused people who expected it to decide. Local-only mode leaves both project files untouched; its consumer skills reference the shared guide directly.

**It didn't create my triage labels.**

When the label section runs, setup writes the role mapping and creates missing configured labels on GitHub or GitLab, in either storage mode. [Wayfinder](https://aihero.dev/skills-wayfinder)'s `wayfinder:map` and `wayfinder:<type>` labels are separate from these five triage roles.

**Can I configure the other skills' behaviour here ([grilling](https://www.aihero.dev/ai-coding-dictionary/grilling) cadence, question format, tone)?**

No. It configures three things: tracker, labels, doc layout. Users have asked to make it the place for per-user preferences. The answer is that skills stay opinionated and take no per-user config. Preferences belong in your `CLAUDE.md` as plain instructions, which every skill already reads.

**Can I keep the config in `~/.claude` instead of committing it to every repo?**

Choose Local-only mode to avoid committing preferences, but this fork uses the sibling `.skills/<main-checkout-folder-name>/` directory, not `~/.claude`. A user who runs the skills across many repos has an open request for user-level storage; this option keeps separate preferences per main checkout. Worktrees share their main checkout's configuration, while separate clones have separate paths. Moving or renaming the checkout changes that path; changing its remote does not. Setup does not move preferences automatically.

**Isn't it strange to have a skill that configures the other skills?**

One long-standing complaint says yes, in these words: *"having a skill to set up the other skill does not feel right to me: that means the LLM is configuring its own skills."* The trade-off is real. Without a setup step, every skill that touches issues would need its own copy of the tracker instructions. The output is markdown you can read and edit, and that limits the risk. You can read every file it wrote and change it by hand. Make day-to-day changes that way, not with another run.

## It's working if

- Project mode writes `docs/agents/` preferences and the original `## Agent skills` pointer.
- Local-only mode reports the sibling preference paths, and consuming skills follow the shared-guide reference to find them.
- Local-only mode leaves project files unchanged; reruns retain the chosen mode.
- The tracker it proposed matches the remote you use, and the label strings match labels that exist in your tracker.
- Afterwards, `/to-tickets` publishes without asking you where issues live, and `/triage` applies labels rather than inventing them.
- Nothing in the skill files themselves changed. If setup edited a `SKILL.md`, something went wrong.

## Where it fits

`setup-matt-pocock-skills` is the **run-once setup** for the engineering flow, the precondition everything else assumes rather than a step in the chain. Its neighbours are its readers: [triage](https://aihero.dev/skills-triage), which applies the label vocabulary written here; [to-spec](https://aihero.dev/skills-to-spec) and [to-tickets](https://aihero.dev/skills-to-tickets), which publish into the tracker named here; and [wayfinder](https://aihero.dev/skills-wayfinder), which reads the "Wayfinding operations" section of the same tracker file to learn how to store maps and child [tickets](https://www.aihero.dev/ai-coding-dictionary/ticket). [domain-modeling](https://aihero.dev/skills-domain-modeling) later fills in the domain-doc layout that setup records. It creates `GLOSSARY.md` and ADRs only when you resolve a term or decision, so a repo with no domain docs after setup is normal. For which skill to reach for next, [ask-matt](https://aihero.dev/skills-ask-matt) routes the whole set.
