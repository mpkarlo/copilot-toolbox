## What it does

`setup-matt-pocock-skills` answers three questions about one repo: where issues live, what the triage labels are called, and where the domain docs sit. It records the answers as markdown files in a user-local configuration directory keyed by the canonical Git remote, not in the project.

Those files are the only thing that varies between repos. The skills themselves are identical everywhere. One user-level bootstrap loads the shared configuration guide, which supplies the current repo's preferences to the session. Individual skills keep their existing instructions, without repeated resolver requirements or project instruction pointers. That is why the set is not tied to GitHub, and why you never edit a skill file to point it at another tracker.

It is a prompt-driven skill backed by a deterministic, read-only path resolver. It inspects your remote and existing preferences, proposes what it found, and waits for confirmation before writing the local files. Glossaries, ADRs, tickets and other project artifacts stay where they were.

## When to reach for it

You invoke this by typing `/setup-matt-pocock-skills`; the [agent](https://www.aihero.dev/ai-coding-dictionary/agent) won't reach for it on its own. Its metadata marks it non-invokable on purpose, so no other skill can fire it for you.

Reach for it once per repo before tracker-dependent work, or to choose custom domain-document paths. If [triage](https://aihero.dev/skills-triage), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets) or [wayfinder](https://aihero.dev/skills-wayfinder) lack a tracker or mapping, setup supplies them. Optional glossary lookups do not require setup: absent domain preferences retain conventional project paths. You can run setup halfway through a project without losing earlier work.

## Prerequisites

Install setup alongside the consuming skills, even for individual-skill installs. The shared resolver requires Git and Node.js 18 or newer, runs from the current project, and saves preferences in a visible sibling folder beside the main checkout:

| Main checkout | Configuration directory |
| --- | --- |
| `C:\Code\my-skills` | `C:\Code\skill-config\mpkarlo-my-skills-ea29c2237fcb\` |
| `/home/me/code/my-skills` | `/home/me/code/skill-config/mpkarlo-my-skills-ea29c2237fcb/` |

Set `MATT_POCOCK_SKILLS_CONFIG_HOME` to an absolute path to override the `skill-config` root consistently in all harnesses. A home-folder `skill-config` is another option when clones are spread across different parents. Directly under the root, `<owner>-<repo>-<short-hash>/` holds `issue-tracker.md`, `domain.md`, and `triage-labels.md` when a role-applying skill is installed. Relative overrides are errors. These files are personal and not committed; teammates run setup independently.

For example, the complete Windows tracker path for that checkout is `C:\Code\skill-config\mpkarlo-my-skills-ea29c2237fcb\issue-tracker.md`. The readable name is sanitised and the hash is the first 12 SHA-256 hex characters of the canonical identity `github.com/mpkarlo/my-skills`. Setup prints the resolved absolute directory and every written file path before confirmation and after saving. Installation alone creates no preference files.

The identity comes from `origin`'s fetch URL, or the sole remote when there is no `origin`. Multiple remotes without `origin` require an explicit choice. Transport, credentials, trailing slash and `.git` are removed; the hostname is lowercased, as are repository paths on GitHub.com and GitLab.com. Non-default ports remain distinct. Worktrees resolve from their main checkout, so share preferences even when located elsewhere. Clones share only when their checkout parents or override roots match; forks do not share with upstream. A remote-less Git repo uses its real Git common directory as the identity and its main checkout name as the readable prefix. If you have not initialised Git, setup asks before doing so.

## One bootstrap, not one change per skill

Setup offers one short block in the **user-level instruction file your harness loads**, after confirming its exact path and text. The block points to the shared `REPOSITORY-CONFIG.md` in a stable installed setup directory. It applies across projects: the guide resolves the current repository and loads its preferences at session start or before the first engineering skill, then again when changing repositories.

No project `AGENTS.md` or `CLAUDE.md` changes are needed. Each harness needs its own one-time bootstrap; setup does not assume that one harness reads another's global file. If you decline that edit, explicitly load the guide yourself each session. If the harness has no user-level instruction support, discovery cannot be automatic. This is agent instruction indirection, not a filesystem alias for external scripts.

Tracker operations still stop when tracker configuration is missing, and role-applying operations require a label mapping. Domain preferences are optional: without `domain.md`, skills retain root `GLOSSARY.md`, `GLOSSARY-MAP.md` when present, and relevant `docs/adr/` paths. Missing artifacts remain normal. With a configured layout, the shared guide supplies alternate project paths without changing the domain skills.

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

The first three ship as templates in the skill and work out of the box. Local markdown is a full option, not a fallback. The skill supports a solo project with no remote. One caveat: don't use local markdown if you use GitHub. They are alternatives, so pick one.

"Other" is a full option too. It is how Jira, Linear, Azure DevOps and Beads all work. You describe the workflow, the skill records your prose in the user-local `issue-tracker.md`, and the downstream skills follow the prose. Users have already built this: a Jira-over-[MCP](https://www.aihero.dev/ai-coding-dictionary/mcp) variant, a Gitea CLI shaped like `gh`, a hand-built local dashboard.

## Common questions

**Do I have to use GitHub?**

No. GitHub, GitLab and local markdown under `.scratch/` all ship as ready-made templates, and anything else works through the "other" path. This is the most-repeated question, in roughly these words: *"hard locked to github"*, *"can I use GitLab / Jira"*, *"what about Azure DevOps"*. The answer is always the same: setup chooses the tracker, not the skill.

**Do I need to re-run it after updating the skills?**

Rerun to migrate legacy project config, change trackers, or refresh instructions that have drifted from newer templates. Setup reads existing preferences first and preserves customisations. You can edit the local files directly for everyday changes.

**Will it edit project `CLAUDE.md`, `AGENTS.md`, or existing `docs/agents/` files?**

No. Setup can read them as migration input, then copy confirmed preferences to sibling storage. It leaves project files and old pointers untouched. It separately offers a single user-level bootstrap, with explicit confirmation, in the file your [harness](https://www.aihero.dev/ai-coding-dictionary/harness) actually loads.

**It didn't create my triage labels.**

When the label section runs, setup writes the role mapping and creates missing configured labels on GitHub or GitLab. An identity mapping still needs to be recorded locally. [Wayfinder](https://aihero.dev/skills-wayfinder)'s `wayfinder:map` and `wayfinder:<type>` labels are separate from these five triage roles.

**Can I configure the other skills' behaviour here ([grilling](https://www.aihero.dev/ai-coding-dictionary/grilling) cadence, question format, tone)?**

No. It configures three things: tracker, labels, doc layout. Skills stay opinionated about everything else. Interaction preferences belong in your `CLAUDE.md` as plain instructions, which every skill already reads.

**Can I keep config outside every repo, or share it across clones?**

Yes. The default is the sibling `skill-config` folder, and worktrees share their main checkout's preferences. Use `MATT_POCOCK_SKILLS_CONFIG_HOME` for a shared root when clones have different parents. Changing the remote changes the directory name; moving the main checkout changes the default root. Rerun setup or explicitly copy confirmed preferences into the newly resolved directory. Older AppData/XDG/Application Support config is not silently read or moved. Missing required tracker or label preferences stop their dependent operations with a setup-first message. Domain preferences remain optional.

**Isn't it strange to have a skill that configures the other skills?**

One long-standing complaint says yes, in these words: *"having a skill to set up the other skill does not feel right to me: that means the LLM is configuring its own skills."* The trade-off is real. Without a setup step, every skill that touches issues would need its own copy of the tracker instructions. The output is markdown you can read and edit, and that limits the risk. You can read every file it wrote and change it by hand. Make day-to-day changes that way, not with another run.

## It's working if

- Setup reports the exact user-local directory containing your confirmed preferences.
- One user-level bootstrap points to an existing installed guide; individual skills have no repeated lookup boilerplate.
- Project instruction files, legacy config and domain artifacts are unchanged by preference setup.
- The tracker it proposed matches the remote you use, and the label strings match labels that exist in your tracker.
- Afterwards, `/to-tickets` publishes without asking you where issues live, and `/triage` applies labels rather than inventing them.
- Nothing in the skill files themselves changed. If setup edited a `SKILL.md`, something went wrong.

## Where it fits

`setup-matt-pocock-skills` is the **run-once setup** for the engineering flow, the precondition everything else assumes rather than a step in the chain. Its neighbours are its readers: [triage](https://aihero.dev/skills-triage), which applies the label vocabulary written here; [to-spec](https://aihero.dev/skills-to-spec) and [to-tickets](https://aihero.dev/skills-to-tickets), which publish into the tracker named here; and [wayfinder](https://aihero.dev/skills-wayfinder), which reads the "Wayfinding operations" section of the same tracker file to learn how to store maps and child [tickets](https://www.aihero.dev/ai-coding-dictionary/ticket). [domain-modeling](https://aihero.dev/skills-domain-modeling) later fills in the domain-doc layout that setup records. It creates `GLOSSARY.md` and ADRs only when you resolve a term or decision, so a repo with no domain docs after setup is normal. For which skill to reach for next, [ask-matt](https://aihero.dev/skills-ask-matt) routes the whole set.
