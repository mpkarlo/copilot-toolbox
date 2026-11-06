Skills are organized into bucket folders under `skills/`:

- `engineering/`: daily code work
- `productivity/`: daily non-code workflow tools
- `misc/`: kept around but rarely used, not promoted
- `in-progress/`: beta: public on purpose, feedback wanted, not shipped in the plugin
- `deprecated/`: no longer used

Every skill in `engineering/` or `productivity/` (the **promoted** buckets) must have a reference in the top-level `README.md` and be included in the portable Copilot plugin bundle under `plugins/copilot-toolbox/skills/`. Skills in `misc/`, `in-progress/`, and `deprecated/` must not appear in the top-level inventory or Copilot bundle.

The supported distribution routes are the GitHub Copilot app, Copilot CLI, and VS Code, all through `.github/plugin/marketplace.json`, which points to the portable plugin at `plugins/copilot-toolbox`. Install commands are copied verbatim from [.agents/install-block.md](./.agents/install-block.md). Sources remain available for other agents without a tested-support claim.

The canonical skill sources stay bucketed under `skills/`. Agent Plugins expects a flat `skills/<name>/SKILL.md` layout, so `plugins/copilot-toolbox/skills/` is generated from the promoted source directories. After changing promoted skills, run `npm run sync:copilot-plugin`, and verify with `npm run check:copilot-plugin`. `npm run version` syncs the Copilot plugin manifest and marketplace entry with `package.json`, and aligns both root `package-lock.json` version fields. Run `npm run validate:plugin` after changing Copilot plugin metadata or marketplace configuration. For model-free CLI validation and its limits, follow [CONTRIBUTING.md](./CONTRIBUTING.md#plugin-validation).

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

Each bucket folder has a `README.md` that lists every skill in the bucket with a one-line description, with the skill name linked to its `SKILL.md`. The promoted buckets' `README.md`s and the top-level `README.md` group entries into **User-invoked** and **Model-invoked**; non-promoted bucket `README.md`s (`misc/`, `in-progress/`) use a flat list.

Skills in `engineering/` and `productivity/` also have a human-facing docs page at `docs/<bucket>/<skill-name>.md`, read directly on GitHub. When you add, rename, or change a promoted skill's behaviour, update its guide following [.agents/writing-docs.md](./.agents/writing-docs.md). That checklist covers purpose, invocation and prerequisites, expected results, side effects, and limits; page layout is flexible. Use revision-relative links for this fork's guides and repository-owned files. Non-promoted skills get no docs page; a promoted skill removed outright keeps an archived page.

Every `SKILL.md` declares intended invocation: user-invoked skills are intended for explicit human requests and retain `disable-model-invocation: true` plus `policy.allow_implicit_invocation: false` in `agents/openai.yaml`; model-invoked skills are intended for either agent selection or human requests. Preserve the paired metadata described in [.agents/invocation.md](./.agents/invocation.md). Runtime enforcement and skill loading remain unverified; successful discovery does not establish either.

[`ask-matt`](./skills/engineering/ask-matt/SKILL.md) is the router that maps the skills intended for human use and how they relate. The same trigger that re-syncs a docs page applies to it: whenever you add, rename, remove, or change how such a skill fits the flows, re-read `ask-matt`'s `SKILL.md` and update it so the map stays accurate: a new skill it never mentions, or a stale one it still routes to, is a router that lies.

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs, `README.md`, `CHANGELOG.md`, ADRs, changesets, code comments). Where a sentence reaches for one, rewrite it instead with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants; never do a blind character substitution.

## Agent skills

### Issue tracker

Before substantive implementation, follow the issue, review, and completion rules in [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md). Issues and specs live in GitHub Issues; use `gh` for tracker operations.

### Triage labels

The five canonical triage labels are used unchanged. Issues are judged against `SCOPE.md`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
