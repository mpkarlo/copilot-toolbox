# The canonical install block

Keep the install commands in `README.md` and this file in sync. Change the commands here first.

## Managed installs first

Lead with installs that update themselves. Fall back to skills.sh, labelled "manual updates", only for agents that have no such install. Call a route managed only if it updates without the user running a command. Put any one-time opt-in beside its install command. Never promise "instant".

Claude Code and Codex use this repo's `.claude-plugin/marketplace.json`. The GitHub Copilot app, Copilot CLI, and VS Code use `.github/plugin/marketplace.json`, which points to the portable plugin under `plugins/copilot-toolbox`. The release workflow keeps plugin versions aligned with `package.json`.

| Agent        | Install route                            | Update and management notes                               |
| ------------ | ---------------------------------------- | --------------------------------------------------------- |
| Claude Code  | `@mpkarlo` marketplace                   | Manage through Claude Code's plugin commands              |
| Codex        | `@mpkarlo` marketplace                   | Updates at startup                                         |
| Copilot app  | Customize > add the `mpkarlo` marketplace | Manage from the app's Installed view                       |
| Copilot CLI  | `@mpkarlo` marketplace                   | Auto-update requires a one-time `autoUpdate: true` setting |
| VS Code      | Chat: Manage Plugin Marketplaces         | Manage from Customize                                      |
| Gemini CLI   | `gemini skills install` (copies)         | Re-run the install commands to update                      |
| Other agents | skills.sh                                | Run `npx skills update`, and re-run `add` for new skills   |

## GitHub Copilot app

<canonical-block name="copilot-app">

In the app, open **Customize**, open the marketplace settings beside the marketplace dropdown, and add `https://github.com/mpkarlo/copilot-toolbox`. Browse the `mpkarlo` marketplace and install **copilot-toolbox**.

</canonical-block>

## Claude Code

<canonical-block name="claude-code">

```bash
claude plugin marketplace add mpkarlo/copilot-toolbox
claude plugin install copilot-toolbox@mpkarlo
```

</canonical-block>

## Codex

<canonical-block name="codex">

```bash
codex plugin marketplace add mpkarlo/copilot-toolbox
codex plugin add copilot-toolbox@mpkarlo
```

Updates itself at startup.

</canonical-block>

## GitHub Copilot CLI

<canonical-block name="copilot">

```bash
copilot plugin marketplace add mpkarlo/copilot-toolbox
copilot plugin install copilot-toolbox@mpkarlo
```

Then, once, add to `~/.copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "mpkarlo": { "source": { "source": "github", "repo": "mpkarlo/copilot-toolbox" }, "autoUpdate": true }
  }
}
```

</canonical-block>

## Visual Studio Code

<canonical-block name="vscode">

Run **Chat: Manage Plugin Marketplaces**, choose **Add Marketplace...**, and enter `https://github.com/mpkarlo/copilot-toolbox`. Then find and install **copilot-toolbox** from **Customize**.

</canonical-block>

## Gemini CLI

Gemini doesn't read `.claude-plugin`, and `--path` takes one bucket. One install per promoted bucket gives exactly the promoted set (27 skills, verified 2026-10-07).

<canonical-block name="gemini">

```bash
gemini skills install https://github.com/mpkarlo/copilot-toolbox.git --path skills/engineering
gemini skills install https://github.com/mpkarlo/copilot-toolbox.git --path skills/productivity
```

Re-run both commands to update.

</canonical-block>

## Every other agent, or editable files (skills.sh)

`-a` preselects the agent. Each agent in the comment was run on 2026-10-07. Prefer skills.sh to an agent's own repo installer, such as `amp skill add` or `pi install git:…`, because those also pull in `misc/` and `in-progress/`. `npx skills update` skips skills added upstream since `add`, so the block tells users to re-run `add`.

<canonical-block name="other-agents">

```bash
npx skills@latest add mpkarlo/copilot-toolbox -a <agent>  # cursor, opencode, devin, windsurf, amp, pi; omit -a to choose
```

When the installer asks which skills to take, include `setup-matt-pocock-skills`. To update, run `npx skills@latest update`, and re-run `add` to pick up new skills.

</canonical-block>

Use the single-skill form wherever one skill is named on its own. `docs/` pages don't use this block, because ai-hero renders the install widget above the page body. See [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add mpkarlo/copilot-toolbox --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling everywhere.

## The two routes are exclusive

The plugin is a managed, read-only bundle you subscribe to. skills.sh writes files you own and edit. Installing both leaves the user with every skill twice: always say "pick one".
