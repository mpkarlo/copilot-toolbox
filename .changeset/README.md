# Changesets

This folder is the active release queue for Copilot Toolbox. Add changesets here
for fork-specific changes. The package, portable plugin manifest and marketplace
entry started at an untagged `0.1.0` development baseline.

The 19 inherited pending changesets are preserved in
[`historical/changesets/mattpocock-skills/`](../historical/changesets/mattpocock-skills/),
outside the active queue. Their contents are unchanged from the fork's baseline,
including package names and historical references. Do not restore them to this
folder for a fork release. Published original-project `1.x` entries remain in
[`CHANGELOG.md`](../CHANGELOG.md), labelled as historical context.

Use `npm run changeset` to add a release note and `npm run changeset -- status`
to inspect the queued release plan without consuming it. `npm run version`
consumes queued changesets, updates the changelog and synchronizes the plugin
manifest and marketplace version with `package.json`. It is a release operation,
not a validation command.

The Local-only preferences and `cpt-configure` changesets were consumed and
published in `v0.2.0`; see [`CHANGELOG.md`](../CHANGELOG.md). The queue holds only
changesets added since. Release-history archival does not tag a release
or repair repository permissions for automated version pull requests. A generated
`changeset-release/main` branch is not an approved release or permission to merge it.

See the [Changesets documentation](https://github.com/changesets/changesets)
for the release-note format and versioning behavior.
