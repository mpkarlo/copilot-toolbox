# Repository-local preferences in user storage

This is the single session-level guide for repository preferences. A user-level instruction points here once per harness; individual skills do not need resolver instructions. Install `setup-matt-pocock-skills` alongside the skills you use. Reading this reference does not invoke the user-only setup skill.

## One-time user-level bootstrap

Add the following block to the user-level instruction file your harness actually loads, replacing the placeholder with the absolute path of this installed guide. Do not put it in a project's `AGENTS.md` or `CLAUDE.md`. Setup presents the exact target and text for confirmation before writing it. Keep one block per user-level instruction file, preserving unrelated content. A different harness needs its own user-level bootstrap; a relative link or a configuration folder alone is not automatically discovered.

```markdown
## Matt Pocock skills: local repository preferences

Before using Matt Pocock's engineering skills in a Git project, read
`<absolute installed setup-matt-pocock-skills path>/REPOSITORY-CONFIG.md`
and follow its session-level loading rules for the current project.
Load preferences again when changing repositories. Pass this instruction
and the project directory to subagents.
```

Use a stable installed skill path, not a temporary implementation worktree. If the harness has no user-level instruction mechanism, report that limitation rather than editing project instructions or duplicating the block into skills. This is an instruction-based lookup, not an operating-system alias: it does not redirect literal filesystem reads by external scripts.

## Session-level loading rules

Use Git and the agent's existing shell and file tools to resolve the directory below from the current project, once before using the engineering skills. Read available `issue-tracker.md`, `triage-labels.md`, and `domain.md` into session context so the skills' existing "should have been provided" preconditions are satisfied centrally. No Node.js, package installation, or bundled executable is needed.

- Tracker operations require readable, nonempty tracker instructions and a confirmed target. If missing, incomplete or invalid, stop only tracker operations and tell the user to run `/setup-matt-pocock-skills`. Never infer GitHub or local markdown, even if a skill mentions a fallback.
- Operations applying triage roles also require a readable, complete label mapping. Missing mappings mean setup first, not invented label strings.
- Domain configuration is optional. When `domain.md` exists and is valid, use its project-relative glossary/map/ADR paths wherever skills mention conventional paths. If absent, retain the original conventions: root `GLOSSARY.md`, root `GLOSSARY-MAP.md` when present, and relevant `docs/adr/` directories. Missing domain artifacts are normal; do not require setup or create files merely to read vocabulary.
- If an existing config file is unreadable, empty or invalid, report its exact path rather than silently ignoring it. Block the operation needing that config; unrelated work and conversation can continue.

Pass these rules, the project directory, and any resolved preference paths to subagents, including fresh worktrees. Re-resolve when switching repositories. Do not create symlinks, move glossaries or ADRs, or change project output paths to implement this indirection. Explicit project/user instructions take precedence over preferences; report conflicts rather than overriding them.

## Resolve the current repository

Run `git rev-parse --show-toplevel`, `git rev-parse --git-dir`, and `git rev-parse --git-common-dir` from the current project. Resolve relative results against that working directory and resolve filesystem links before comparing them. Check command failures; outside a Git working tree, stop configuration-dependent operations and tell the user to run setup.

List remote names with `git remote`. Use the fetch URL of `origin` (`git config --get-all remote.origin.url`). Without `origin`, use the sole remote's configured fetch URL. Multiple remotes without `origin` are ambiguous: stop and ask which is canonical rather than choosing upstream. Normalise HTTP(S), SSH, Git and SCP-style URLs to `host[:port]/namespace/repository`: strip credentials, transport, trailing slash and `.git`. Omit default ports (HTTP 80, HTTPS 443, SSH 22, Git 9418). Lowercase the hostname, and repository paths on GitHub.com and GitLab.com only. Preserve nested namespaces, other hosts' path case and non-default ports. Reject URLs with query strings, fragments, unsupported transports or no repository path. If multiple fetch URLs normalise to different identities, stop and ask which is canonical. Never include credentials in displayed identities or saved preferences.

Name the config directory `<slug>-<hash>`. The slug is the last two repository path components (normally owner and repo), lowercased, joined with a hyphen, sanitised to ASCII letters/digits/hyphens and limited to 80 characters. The hash is the first 12 hex characters of SHA-256 of the full UTF-8 identity, distinguishing hosts, namespaces and forks. For a Git repository without remotes, use `local:<absolute real Git common directory>` as the identity and the main checkout folder name as the slug. Resolve `git rev-parse --git-common-dir` relative to the current working directory.

For the slug, replace runs of other characters with `-`, trim leading/trailing hyphens, truncate to 80 characters and trim trailing hyphens again; use `repository` if empty. Compute the hash with existing OS tools, not by guessing it or installing a runtime. Hash the identity exactly, without a newline or byte-order mark:

Windows PowerShell, with `$identity` already set to the canonical identity:

```powershell
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($identity)
    $hash = ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant().Substring(0, 12)
} finally {
    $sha256.Dispose()
}
```

On Linux use `printf '%s' "$identity" | sha256sum`; on macOS use `printf '%s' "$identity" | shasum -a 256`. Take the first 12 lowercase hex characters of the digest. If the platform tool is unavailable or fails, report that limitation rather than installing software, inventing a hash, or choosing a different directory.

## Resolve the user config directory

The default root is a visible `skill-config` folder **beside the main checkout**, on every platform. If the resolved Git directory and common directory are equal, use the project root as the main checkout, including repositories with separately stored Git metadata. Otherwise use the first `worktree` entry from `git worktree list --porcelain -z`; parse NUL-delimited entries so spaces and quoted paths are handled correctly. If that entry is bare or has no usable checkout, report the unsupported layout rather than guessing a parent. Linked worktrees use this main checkout, not their own parent directory or the installed skill location.

| Platform | Configuration directory, relative to the main checkout |
| --- | --- |
| Windows | `..\skill-config\<owner>-<repo>-<short-hash>\` |
| Linux / macOS | `../skill-config/<owner>-<repo>-<short-hash>/` |

`MATT_POCOCK_SKILLS_CONFIG_HOME`, when set, overrides the entire root and must be an absolute, nonempty path. Do not expand a literal `~` or accept a drive-relative Windows path. A home-folder `skill-config` can provide a shared root across checkout parents. Preferences live directly in `<root>/<slug>-<hash>/`, without an extra `repositories` folder:

- `issue-tracker.md`: tracker workflow, target repository, and PR request-surface flag
- `triage-labels.md`: canonical-role mapping
- `domain.md`: domain-document locations and consumer rules

Read the files needed by the operation from that directory. Resolve again when switching repositories or after adding/changing the canonical remote. Pass the current project directory and this resolution contract to subagents; never use the installed skills repo as the target tracker.

Worktrees share their main checkout's config. Clones with the same canonical remote share only when their main checkouts have the same parent, or an explicit override selects the same root. Moving the main checkout to another parent changes the default root. If the sibling folder is not writable, report the error and suggest an absolute override; never silently fall back to another location.

## Missing configuration and migration

For missing required tracker/label files, report their exact paths and stop the dependent operation with a setup-first message. Domain preferences remain optional as described above. If this reference is unavailable, install setup and repair the user-level bootstrap path.

Consumers do not follow `AGENTS.md` / `CLAUDE.md` pointers or fall back to `docs/agents/*`. Setup may read those legacy files as migration input, show them for confirmation, and copy agreed preferences into user storage. Leave legacy files and instruction pointers untouched unless their removal is explicitly requested. Do not copy tokens or credentials into preferences.

Earlier versions of this fork used platform user-config roots (AppData, XDG config, or Application Support), under `matt-pocock-skills/repositories/<full-identity-hash>/`. They are not read as a fallback. If you already ran that setup, explicitly copy the three confirmed preference files to the new resolved sibling directory, or rerun setup. Leave the old files untouched unless removal is requested.

## Preferences are not project artifacts

Paths inside preferences are relative to the current project root, not the config directory. Read domain documents at the configured locations before exploring or writing domain terms. In consumer prose, `GLOSSARY.md`, `GLOSSARY-MAP.md`, and `docs/adr/` stand for the corresponding configured project paths.

Keep glossaries, ADRs, specs, tickets, research outputs and other generated artifacts in their existing project locations. Once a layout is configured, missing glossary/ADR artifacts are normal: create them lazily as before.
