# Contributing

Every issue is judged against the bar in [`SCOPE.md`](./SCOPE.md). Read it first.

## Where each request goes

| You have | Go to |
| --- | --- |
| A bug in a skill | [Bug issue](https://github.com/mpkarlo/copilot-toolbox/issues/new?template=bug.yml) |
| A change to an existing skill | [Idea or feedback issue](https://github.com/mpkarlo/copilot-toolbox/issues/new?template=idea.yml) |
| A question, or "how do I...?" | [Discussions: Q&A](https://github.com/mpkarlo/copilot-toolbox/discussions/categories/q-a) |
| An idea for a new skill, or a skill to donate | [Discussions: Ideas](https://github.com/mpkarlo/copilot-toolbox/discussions/categories/ideas) |
| Support for another harness or issue tracker | [Discussions: Ideas](https://github.com/mpkarlo/copilot-toolbox/discussions/categories/ideas), after you read [`.out-of-scope/`](./.out-of-scope) |

Pull requests are open to collaborators only, so describe the fix in an issue instead.

## Plugin validation

The supported plugin distribution is for the GitHub Copilot app, Copilot CLI, and VS Code. See the [installation instructions](./README.md#installation).

`npm run validate:plugin` runs the structural checks. A separate GitHub Actions
job runs `npm run test:cli-compatibility` and `npm run check:cli-compatibility`
on Windows and Ubuntu, using GitHub CLI 2.102.1 and Copilot CLI 1.0.105.
You can run those commands locally with the same tools and GitHub CLI authentication.
The structural checks also require `package.json`, both root `package-lock.json`
version fields, and the Copilot manifest and catalog versions to agree.

The compatibility check uses GitHub's skill publishing dry run without publishing,
then checks that Copilot discovers the local plugin and every promoted skill.
Copilot uses a temporary configuration directory; personal settings and installed
plugins are unchanged. Skill and plugin warnings fail the check. The exact
tag-protection advisory is the deferred exception, not evidence that tags are protected.
Discovery does not prove skill invocation or agent behavior. A failed compatibility
job blocks the release job.

User-invoked skills retain their manual-only metadata. The upstream report
[github/copilot-cli#4438](https://github.com/github/copilot-cli/issues/4438)
describes a possible invocation limitation that has not been verified here.
Successful discovery does not establish that a user-invoked skill loads.

## Maintainer implementation records

Maintainer-authored specs and implementation tracking follow [the repository tracking policy](./docs/agents/issue-tracker.md). The contributor-request guidance below does not prohibit approved maintainer specs.

## Issues written with AI

Agents are welcome to help, but you post the issue, so you own it:

- **One problem per issue.** Several findings from one session are several issues, or none.
- **Short.** If it does not fit on one screen, cut it.
- **Repro first.** The steps that show the problem come before any analysis.
- **No pasted specs.** No full proposals, plans, or rewritten `SKILL.md` files. Describe the problem; the fix is ours to design.
- **Not your project's issues.** If your agent files the specs or tickets for your own project here, it has the wrong repo. Run `/cpt-configure` in your project.
