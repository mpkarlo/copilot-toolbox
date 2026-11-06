## What it does

`cpt-configure` records the repository preferences shared by engineering skills: issue-tracker workflow, triage-label vocabulary, and domain-document locations. Its defining constraint is that it shows one settings snapshot and gets confirmation before writing preferences or taking Git or tracker actions.

The configuration is repeatable. It preserves settings and custom instructions you do not ask to change, and can keep personal preferences outside the repository without changing project instructions.

## When to reach for it

This skill is intended for explicit requests; ask for `/cpt-configure` when it is available. Reach for it before the first tracker-dependent engineering skill, or when you want to review or change repository preferences. For help choosing a workflow rather than configuring preferences, use [ask-matt](./ask-matt.md).

## Prerequisites

Local-only mode needs a Git working tree so the skill can find the main checkout. GitHub and GitLab tracker setup also needs the matching CLI and a verified repository. Project mode can use local markdown without a remote.

## Storage mode

For a new setup, the skill asks which mode to use and recommends **Local-only** to keep personal preferences out of the repository. When preferences already exist in one mode, it preserves that mode unless you request a switch. If both locations contain preferences, it asks which mode to use.

| Mode | Preferences | Project instructions |
| --- | --- | --- |
| Local-only | Sibling `.skills/<main-checkout-folder-name>/` directory | Unchanged |
| Project | `docs/agents/` | Only the `## Agent skills` block in `AGENTS.md` is updated; it asks before creating a missing file and never updates `CLAUDE.md` |

Switching modes writes approved settings at the selected location without moving, merging, or deleting files at the previous location. The saved PR/MR request-surface preference is carried forward, but is not shown as a setting or offered as a choice.

## The settings snapshot

The preview shows one snapshot of applicable settings, with each current or proposed value and a plain-language description. It includes the tracker, storage mode, triage labels when the `triage` skill is installed, and domain-document paths. It also lists exact preference paths and separately discloses Git and tracker actions.

For GitHub or GitLab, the selected CLI verifies the intended repository before preference writes or label creation. The skill retrieves the complete label list and compares exact names before previewing missing labels. Lookup errors stop the process rather than guessing. Domain settings record where glossaries and ADRs live; missing domain artifacts are not created just to fill the configuration.

## Common questions

**What happened to `/setup-matt-pocock-skills`?**

It was renamed to `/cpt-configure`. The source skill stays in the engineering bucket under its current name.

**Do I have to use GitHub?**

No. GitHub, GitLab, local markdown under `.scratch/`, and a workflow you describe are supported. The selected tracker determines how downstream skills read and publish issues.

**What happens when I update an existing setup?**

The skill shows the current settings in one snapshot, applies the changes you request together, and preserves every unmentioned setting and custom instruction. It keeps the existing storage mode unless you request a switch.

**Does switching modes move or delete the old preferences?**

No. It writes the approved settings to the selected location and leaves files in the previous location untouched. It carries the saved PR/MR request-surface value without exposing it in the snapshot.

**How are triage labels handled?**

The skill compares configured labels with a complete label listing from the verified project. If lookup fails or the result is incomplete, it reports the error rather than guessing. It previews exact missing labels before any are created.

**Does Project mode edit `CLAUDE.md` or create domain documents?**

No. It updates only the `## Agent skills` block in `AGENTS.md`; if that file is missing, it asks before creating it. Domain preferences record paths, and glossary or ADR files are created only when the work calls for them.

## It's working if

- The tracker matches the verified repository, and only confirmed missing labels are listed for creation.
- A new setup recommends Local-only mode, while reruns preserve the existing mode.
- The preview lists exact preference paths and separately discloses Git and tracker actions.
- Project mode changes only the `## Agent skills` block in `AGENTS.md`; Local-only mode leaves project files unchanged.
- Unmentioned settings and custom instructions remain in the resulting preference snapshot.

## Where it fits

`cpt-configure` is repeatable repository configuration, not a step in the build chain. Its neighbors are its readers: [triage](./triage.md) applies its label vocabulary; [to-spec](./to-spec.md), [to-tickets](./to-tickets.md), and [wayfinder](./wayfinder.md) use the configured tracker; [domain-modeling](./domain-modeling.md) uses the recorded domain-document layout. [ask-matt](./ask-matt.md) routes the full skill set.
