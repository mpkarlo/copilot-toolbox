# Repository-local preferences in user storage

Setup and consuming skills resolve preferences for the current project, never for the installed skills repository. Install `setup-matt-pocock-skills` alongside consumers, even when installing individual skills. Reading this reference does not invoke the user-only setup skill.

## Shared resolver

Node.js 18 or newer and Git are required. Run the bundled read-only helper with the current project as the working directory:

```text
node "<installed setup-matt-pocock-skills directory>/scripts/repository-config.mjs" [tracker] [labels] [domain]
```

Find that directory from this reference's installed location, not a hardcoded home path. The arguments are literal optional config kinds, not flags: supply only the kinds this operation needs. With no arguments the helper locates config for setup, even when no config exists. With arguments it requires those files to be readable and nonempty. On a nonzero exit, report the error and stop the config-dependent operation. Do not reproduce the identity algorithm independently.

On success, parse its JSON and read the requested `files.tracker`, `files.labels`, and/or `files.domain` paths. Successful path resolution does not mean you have read the preferences. If the helper is missing, tell the user to install setup alongside the consumer and run `/setup-matt-pocock-skills` here.

## Resolve the current repository

Use the fetch URL of `origin`. Without `origin`, use the sole remote. Multiple remotes without `origin` are ambiguous: stop and ask which is canonical rather than choosing upstream. Normalise HTTPS, SSH and SCP-style URLs to `host[:port]/namespace/repository`: strip credentials, transport, trailing slash and `.git`. Lowercase the hostname, and repository paths on GitHub.com and GitLab.com only. Preserve nested namespaces and non-default ports. Reject URLs that do not identify a repository. Never include credentials in displayed identities.

Name the config directory `<slug>-<hash>`. The slug is the last two repository path components (normally owner and repo), lowercased, joined with a hyphen, sanitised to ASCII letters/digits/hyphens and limited to 80 characters. The hash is the first 12 hex characters of SHA-256 of the full UTF-8 identity, distinguishing hosts, namespaces and forks. For a Git repository without remotes, use `local:<absolute real Git common directory>` as the identity and the main checkout folder name as the slug. Resolve `git rev-parse --git-common-dir` relative to the current working directory.

## Resolve the user config directory

The default root is a visible `skill-config` folder **beside the main checkout**, on every platform. Linked worktrees use Git's main checkout entry, not their own parent directory or the installed skill location. For the main working tree, use its project root even when Git metadata is stored separately.

| Main checkout | Configuration directory |
| --- | --- |
| `C:\Code\my-skills` | `C:\Code\skill-config\mpkarlo-my-skills-ea29c2237fcb\` |
| `/home/me/code/my-skills` | `/home/me/code/skill-config/mpkarlo-my-skills-ea29c2237fcb/` |

`MATT_POCOCK_SKILLS_CONFIG_HOME`, when set, overrides the entire root and must be absolute. For example, set it to `C:\Users\me\skill-config` or `/home/me/skill-config` for a home-folder location shared across checkout parents. Preferences live directly in `<root>/<slug>-<hash>/`, without an extra `repositories` folder:

- `issue-tracker.md`: tracker workflow, target repository, and PR request-surface flag
- `triage-labels.md`: canonical-role mapping
- `domain.md`: domain-document locations and consumer rules

Read the files needed by the operation from that directory. Resolve again when switching repositories or after adding/changing the canonical remote. Pass the current project directory and this resolution contract to subagents; never use the installed skills repo as the target tracker.

Worktrees share their main checkout's config. Clones with the same canonical remote share only when their main checkouts have the same parent, or an explicit override selects the same root. Moving the main checkout to another parent changes the default root. If the sibling folder is not writable, report the error and suggest an absolute override; never silently fall back to another location.

## Missing configuration and migration

If a needed file is missing, unreadable, empty, or lacks the instructions the operation needs, report its exact path and stop the config-dependent operation. Tell the user to run `/setup-matt-pocock-skills` in this repository. Do not silently default to GitHub, local markdown, canonical label strings, or a domain layout. If this reference is unavailable, install setup alongside the consumer first.

Consumers do not follow `AGENTS.md` / `CLAUDE.md` pointers or fall back to `docs/agents/*`. Setup may read those legacy files as migration input, show them for confirmation, and copy agreed preferences into user storage. Leave legacy files and instruction pointers untouched unless their removal is explicitly requested. Do not copy tokens or credentials into preferences.

Earlier versions of this fork used platform user-config roots (AppData, XDG config, or Application Support), under `matt-pocock-skills/repositories/<full-identity-hash>/`. They are not read as a fallback. If you already ran that setup, explicitly copy the three confirmed preference files to the new resolved sibling directory, or rerun setup. Leave the old files untouched unless removal is requested.

## Preferences are not project artifacts

Paths inside preferences are relative to the current project root, not the config directory. Read domain documents at the configured locations before exploring or writing domain terms. In consumer prose, `GLOSSARY.md`, `GLOSSARY-MAP.md`, and `docs/adr/` stand for the corresponding configured project paths.

Keep glossaries, ADRs, specs, tickets, research outputs and other generated artifacts in their existing project locations. Once a layout is configured, missing glossary/ADR artifacts are normal: create them lazily as before.
