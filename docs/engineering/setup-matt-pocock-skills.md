## What it does

`setup-matt-pocock-skills` answers three questions about one repo: where issues live, what the triage labels are called, and where the domain docs sit. It records the answers as markdown files in a user-local configuration directory keyed by the canonical Git remote, not in the project.

Those preferences are the only thing that varies between repos. Consumers resolve the current repo's local files directly; no `AGENTS.md` or `CLAUDE.md` pointer is needed. The tracker remains configurable prose, so you never edit a skill to use another tracker.

It is a prompt-driven skill backed by a deterministic, read-only path resolver. It inspects your remote and existing preferences, proposes what it found, and waits for confirmation before writing the local files. Glossaries, ADRs, tickets and other project artifacts stay where they were.

## When to reach for it

You invoke this by typing `/setup-matt-pocock-skills`; the [agent](https://www.aihero.dev/ai-coding-dictionary/agent) won't reach for it on its own. Its metadata marks it non-invokable on purpose, so no other skill can fire it for you.

Reach for it once per repo, before the first use of any other engineering skill. If [triage](https://aihero.dev/skills-triage), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets) or [wayfinder](https://aihero.dev/skills-wayfinder) start guessing where your issues go, or apply labels your tracker doesn't have, this repo has not been set up yet. You can run it in a repo halfway through a project. The skill reads what is already there, so no earlier work is lost.

## Prerequisites

Install setup alongside the consuming skills, even for individual-skill installs. The shared resolver requires Git and Node.js 18 or newer, runs from the current project, and chooses this user config root:

| Platform | Default root |
| --- | --- |
| Windows | `%LOCALAPPDATA%\matt-pocock-skills`, or `%USERPROFILE%\AppData\Local\matt-pocock-skills` when unset |
| Linux / other Unix | `$XDG_CONFIG_HOME/matt-pocock-skills`, or `~/.config/matt-pocock-skills` when unset |
| macOS | `~/Library/Application Support/matt-pocock-skills` |

Set `MATT_POCOCK_SKILLS_CONFIG_HOME` to an absolute path to override the root consistently in all harnesses. Under it, `repositories/<SHA-256-of-identity>/` holds `issue-tracker.md`, `domain.md`, and `triage-labels.md` when a role-applying skill is installed. Relative environment-provided roots are errors. These files are personal and not committed; teammates run setup independently.

The identity comes from `origin`'s fetch URL, or the sole remote when there is no `origin`. Multiple remotes without `origin` require an explicit choice. Transport, credentials, trailing slash and `.git` are removed; the hostname is lowercased, as are repository paths on GitHub.com and GitLab.com. Non-default ports remain distinct. Clones and worktrees share preferences, but forks do not share with upstream. A remote-less Git repo uses its real Git common directory instead, so local-only worktrees still share config. If you have not initialised Git, setup asks before doing so.

## The three decisions

It starts each section with the recommended answer, and skips any question its exploration already answered. Most runs need only two confirmations.

| Decision | What it proposes | When it asks |
| --- | --- | --- |
| **Issue tracker** | the one matching your `git remote` | always, because this is the one real choice |
| **Triage labels** | keep the five canonical names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) | if `triage`, `to-spec`, or `to-tickets` is installed |
| **Domain docs** | single-context: one `GLOSSARY.md` plus `docs/adr/` at the root | only if it spots monorepo signals, and then it offers a multi-context `GLOSSARY-MAP.md` |

The tracker options:

| Option | Where issues live | Needs |
| --- | --- | --- |
| **GitHub** | the repo's GitHub Issues | the `gh` CLI |
| **GitLab** | the repo's GitLab Issues | the `glab` CLI |
| **Local markdown** | files under `.scratch/<feature>/` in this repo | a local Git repo, no remote needed |
| **Other** | wherever you say | one paragraph from you describing the workflow |

The first three ship as templates. Local markdown is an explicit choice, never a fallback for missing config. A remote proposes a tracker, but setup must confirm the choice. Tracker commands use the confirmed target explicitly, avoiding a fork's upstream default.

"Other" is a full option too. It is how Jira, Linear, Azure DevOps and Beads all work. Describe the workflow and setup records it in the local `issue-tracker.md`. Consumers follow that prose. Store no credentials there.

## Common questions

**Do I have to use GitHub?**

No. GitHub, GitLab and local markdown under `.scratch/` all ship as ready-made templates, and anything else works through the "other" path. This is the most-repeated question, in roughly these words: *"hard locked to github"*, *"can I use GitLab / Jira"*, *"what about Azure DevOps"*. The answer is always the same: setup chooses the tracker, not the skill.

**Do I need to re-run it after updating the skills?**

Rerun to migrate legacy project config, change trackers, or refresh instructions that have drifted from newer templates. Setup reads existing preferences first and preserves customisations. You can edit the local files directly for everyday changes.

**Will it edit `CLAUDE.md`, `AGENTS.md`, or existing `docs/agents/` files?**

No. Setup can read them as migration input, then copy confirmed preferences to user storage. It leaves the old files and pointers untouched. Consumers no longer depend on which instruction file a [harness](https://www.aihero.dev/ai-coding-dictionary/harness) reads.

**It didn't create my triage labels.**

When the label section runs, setup writes the role mapping and creates missing configured labels on GitHub or GitLab. An identity mapping still needs to be recorded locally. [Wayfinder](https://aihero.dev/skills-wayfinder)'s `wayfinder:map` and `wayfinder:<type>` labels are separate from these five triage roles.

**Can I configure the other skills' behaviour here ([grilling](https://www.aihero.dev/ai-coding-dictionary/grilling) cadence, question format, tone)?**

No. The local configuration is limited to tracker, labels and domain-doc paths/rules. General interaction preferences still belong in your own standing instructions or the invocation, not in this setup's configuration.

**Can I keep config outside every repo, or share it across clones?**

Yes. That is now the default. Use `MATT_POCOCK_SKILLS_CONFIG_HOME` for a custom root. Clones and worktrees with the same canonical remote use the same local directory. Changing the remote changes the key, so rerun setup or explicitly copy confirmed preferences into the newly resolved directory. A missing, empty, unreadable or incomplete required config stops the dependent operation with a setup-first message, never an invented tracker default.

**Isn't it strange to have a skill that configures the other skills?**

One long-standing complaint says yes, in these words: *"having a skill to set up the other skill does not feel right to me: that means the LLM is configuring its own skills."* The trade-off is real. Without a setup step, every skill that touches issues would need its own copy of the tracker instructions. The output is markdown you can read and edit, and that limits the risk. You can read every file it wrote and change it by hand. Make day-to-day changes that way, not with another run.

## It's working if

- Setup reports the exact user-local directory containing your confirmed preferences.
- Project instruction files, legacy config and domain artifacts are unchanged by preference setup.
- The tracker it proposed matches the remote you use, and the label strings match labels that exist in your tracker.
- Afterwards, `/to-tickets` publishes without asking you where issues live, and `/triage` applies labels rather than inventing them.
- Nothing in the skill files themselves changed. If setup edited a `SKILL.md`, something went wrong.

## Where it fits

`setup-matt-pocock-skills` is the **run-once setup** for the engineering flow, the precondition everything else assumes rather than a step in the chain. Its neighbours are its readers: [triage](https://aihero.dev/skills-triage), which applies the label vocabulary written here; [to-spec](https://aihero.dev/skills-to-spec) and [to-tickets](https://aihero.dev/skills-to-tickets), which publish into the tracker named here; and [wayfinder](https://aihero.dev/skills-wayfinder), which reads the "Wayfinding operations" section of the same tracker file to learn how to store maps and child [tickets](https://www.aihero.dev/ai-coding-dictionary/ticket). [domain-modeling](https://aihero.dev/skills-domain-modeling) later fills in the domain-doc layout that setup records. It creates `GLOSSARY.md` and ADRs only when you resolve a term or decision, so a repo with no domain docs after setup is normal. For which skill to reach for next, [ask-matt](https://aihero.dev/skills-ask-matt) routes the whole set.
