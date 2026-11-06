# The canonical install block

Keep the install commands in `README.md` and this file in sync. Change the commands here first.

## Supported installation routes

The GitHub Copilot app, Copilot CLI, and VS Code use `.github/plugin/marketplace.json`, which points to the portable plugin under `plugins/copilot-toolbox`. Keep each route's description and install steps aligned with the README. Put the Copilot CLI's one-time auto-update opt-in beside its install commands.

| Agent | Install route | Update and management notes |
| --- | --- | --- |
| Copilot app | Customize > add the `mpkarlo` marketplace | Browse the marketplace and install `copilot-toolbox` |
| Copilot CLI | `@mpkarlo` marketplace | Auto-update requires a one-time `autoUpdate: true` setting |
| VS Code | Chat: Manage Plugin Marketplaces | Add the marketplace, then install from Customize |

## GitHub Copilot app

<canonical-block name="copilot-app">

In the app, open **Customize**, open the marketplace settings beside the marketplace dropdown, and add `https://github.com/mpkarlo/copilot-toolbox`. Browse the `mpkarlo` marketplace and install **copilot-toolbox**.

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
