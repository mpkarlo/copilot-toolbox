# Writing skill guides

Every promoted skill has a human-facing guide at `docs/<bucket>/<skill-name>.md`, mirroring `skills/engineering/` or `skills/productivity/`. This fork's guides are repository Markdown read directly on GitHub. A separate site or Wiki is not assumed.

When a promoted skill is added, renamed, or changes behaviour, update its guide in the same slice. A rename moves the guide; a bucket move moves it to the matching folder. Non-promoted skills get no guide. If a promoted skill is removed outright, keep its guide with an opening `> **Archived.** ...` notice naming the removal version and any replacement.

## Content checklist

Use the layout that best explains the skill. Exact headings and section order are not required. Cover:

- **Purpose and when to use it.** State the job and the defining constraint that distinguishes it from the obvious default. Where a sibling is easy to confuse with it, explain which to choose.
- **How to start and prerequisites.** State the intended invocation: explicit human request, or agent selection as well. Preserve invocation metadata without claiming runtime enforcement or successful loading; discovery alone establishes neither. Name any prior setup, tooling, or workspace it needs.
- **Expected results, side effects, and limits.** Explain what the reader should see, what files or external state it may change, and what it does not establish.

Questions and observable success signals are useful when there is real substance to add. Include the skill's leading idea in its own vocabulary. Explain why it works and where it fits, rather than reproducing the `SKILL.md` runbook.

## Links and installation

Use revision-relative paths for this fork's guides and repository-owned files. Link a guide to its canonical skill when useful, for example `../../skills/engineering/cpt-configure/SKILL.md`; link sibling guides by their relative docs path. Follow links from the containing file, not from the repository root.

Third-party references and clearly historical citations stay external. The fork's own guide is authoritative for its skill; an upstream skill page is not its replacement.

For installation, point readers to [the README](../README.md#installation). The three supported routes and their exact commands live in [the canonical install block](./install-block.md). No external install widget is assumed.

## Finding useful questions

Prefer observed questions to invented ones. Read this fork's relevant issues with `gh issue list --repo mpkarlo/copilot-toolbox --search "<skill-name>" --state all`, and consult the skill's change history for rename, move, and behaviour questions. Clearly historical upstream discussions may inform a guide without becoming its authority.

If the evidence is thin, include only questions a reader would plainly need answered. Size the section to the evidence, not to the length of neighbouring pages.

## Conventions

- Keep the guide about the reader's task. State technical claims directly rather than attributing opinions to the author.
- Use the skill's leading words so its guide and source share vocabulary.
- Present choices as a table or list when readers need to find the matching case.
- Keep third-party vocabulary references where they help; they do not impose a site-specific template.
- Make success signals observable in the reader's work or trace without inspecting skill internals.

## Done when

- The guide lives at the path matching its promoted skill, with no stale guide after a rename or move.
- Purpose, invocation, prerequisites, results, side effects, and limits are covered where applicable.
- The guide describes the current skill rather than restating its steps or delegating its explanation to an upstream page.
- Repository-local links resolve from the guide and stay revision-relative. Independent sources and historical citations remain identifiable.
- The affected guide is updated with its skill; a wholesale rewrite of inherited guides is not a prerequisite.
