import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { canonicalRemote, configRoot, configLocation, resolveRepository, requireConfig } from "../skills/engineering/setup-matt-pocock-skills/scripts/repository-config.mjs";

test("transport aliases share an identity without credentials; forks and hosts stay distinct", () => {
  const options = { platform: "linux", env: {}, mainCheckoutRoot: "/code/repo" };
  const aliases = [
    "https://github.com/Owner/Repo.git",
    "git@github.com:owner/repo.git",
    "ssh://git@github.com:22/owner/repo/",
    "https://user:password@GITHUB.COM/owner/repo.git/",
  ];
  assert.deepEqual(aliases.map(canonicalRemote), Array(4).fill("github.com/owner/repo"));
  assert.equal(canonicalRemote("git@git.example:group/sub/Repo.git"), "git.example/group/sub/Repo");
  assert.notEqual(canonicalRemote("ssh://git@git.example:2222/group/Repo"), canonicalRemote("https://git.example/group/Repo"));
  assert.notEqual(configLocation("github.com/owner/repo", options).directory, configLocation("github.com/fork/repo", options).directory);
  assert.notEqual(configLocation("github.com/owner/repo", options).directory, configLocation("gitlab.com/owner/repo", options).directory);
  assert.match(configLocation("github.com/owner/repo", options).directory, /^\/code\/skill-config\/owner-repo-[a-f0-9]{12}$/);
  assert.match(configLocation("git.example/group/sub/CON", options).directory, /sub-con-[a-f0-9]{12}$/);
  for (const url of ["file:///tmp/repo", "not-a-remote", "https://host/", "https://host/repo?token=secret"]) {
    assert.throws(() => canonicalRemote(url));
  }
});

test("config roots are beside the main checkout on every platform and explicitly overridable", () => {
  assert.equal(configRoot({ platform: "win32", env: {}, mainCheckoutRoot: "C:\\Code\\repo" }), "C:\\Code\\skill-config");
  assert.equal(configRoot({ platform: "linux", env: {}, mainCheckoutRoot: "/code/repo" }), "/code/skill-config");
  assert.equal(configRoot({ platform: "darwin", env: {}, mainCheckoutRoot: "/Users/me/code/repo" }), "/Users/me/code/skill-config");
  assert.equal(configRoot({ platform: "darwin", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "/override" } }), "/override");
  assert.equal(configRoot({ platform: "win32", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "D:\\Config" } }), "D:\\Config");
  assert.throws(() => configRoot({ platform: "linux", env: { MATT_POCOCK_SKILLS_CONFIG_HOME: "relative" } }), /must be absolute/);
  assert.throws(() => configRoot({ platform: "linux", env: {} }), /main checkout path/);
  assert.throws(() => configRoot({ platform: "linux", env: {}, mainCheckoutRoot: "relative" }), /main checkout path/);
  assert.throws(() => configRoot({ platform: "linux", env: {}, mainCheckoutRoot: "/" }), /inside the repository/);
});

test("missing and empty config fail setup-first; only requested kinds are required", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-config-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const location = configLocation("github.com/owner/repo", { env: { MATT_POCOCK_SKILLS_CONFIG_HOME: temporary } });
  requireConfig(location, []);
  assert.deepEqual(readdirSync(temporary), []);
  assert.throws(() => requireConfig(location, ["tracker"]), /Run \/setup-matt-pocock-skills/);
  mkdirSync(location.directory, { recursive: true });
  writeFileSync(location.files.tracker, " \n");
  assert.throws(() => requireConfig(location, ["tracker"]), /Empty tracker/);
  writeFileSync(location.files.tracker, "# Explicit local tracker\n");
  requireConfig(location, ["tracker"]);
  assert.throws(() => requireConfig(location, ["tracker", "labels"]), /Missing labels/);
  assert.throws(() => requireConfig(location, ["unknown"]), /Unknown config kind/);
  mkdirSync(location.files.domain);
  assert.throws(() => requireConfig(location, ["domain"]), /Cannot read domain/);
});

test("Git resolution shares config across clones, subdirectories, and worktrees, not upstream", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-git-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const run = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: "pipe" });
  const repo = path.join(temporary, "repo");
  mkdirSync(repo);
  run(repo, "init", "--quiet");
  const options = { env: { MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "config") } };
  const local = resolveRepository(repo, options);
  const defaults = { env: {} };
  const localDefault = resolveRepository(repo, defaults);
  assert.equal(path.dirname(localDefault.directory), path.join(temporary, "skill-config"));
  assert.match(local.identity, /^local:/);
  run(repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "--allow-empty", "-m", "fixture");
  const worktree = path.join(temporary, "worktrees", "linked");
  mkdirSync(path.dirname(worktree));
  run(repo, "worktree", "add", "--quiet", "-b", "fixture", worktree);
  assert.equal(resolveRepository(worktree, options).directory, local.directory);
  assert.equal(resolveRepository(worktree, defaults).directory, localDefault.directory);
  assert.equal(resolveRepository(worktree, defaults).mainCheckoutRoot, repo);
  run(repo, "remote", "add", "origin", "https://github.com/fork/repo.git");
  run(repo, "remote", "add", "upstream", "https://github.com/owner/repo.git");
  const resolved = resolveRepository(worktree, options);
  const resolvedDefault = resolveRepository(worktree, defaults);
  assert.match(path.basename(resolvedDefault.directory), /^fork-repo-[a-f0-9]{12}$/);
  assert.equal(resolveRepository(repo, defaults).directory, resolvedDefault.directory);
  assert.equal(resolved.identity, "github.com/fork/repo");
  assert.notEqual(resolved.directory, local.directory);
  const sub = path.join(worktree, "nested");
  mkdirSync(sub);
  assert.equal(resolveRepository(sub, options).directory, resolved.directory);
  assert.equal(resolveRepository(sub, defaults).directory, resolvedDefault.directory);
  assert.equal(resolveRepository(sub, options).repositoryRoot.replaceAll("\\", "/"), worktree.replaceAll("\\", "/"));
  const clone = path.join(temporary, "clone");
  mkdirSync(clone);
  run(clone, "init", "--quiet");
  run(clone, "remote", "add", "mirror", "git@github.com:fork/repo.git");
  assert.equal(resolveRepository(clone, options).directory, resolved.directory);
  assert.equal(resolveRepository(clone, defaults).directory, resolvedDefault.directory);
  const otherParent = path.join(temporary, "elsewhere");
  const otherClone = path.join(otherParent, "clone");
  mkdirSync(otherClone, { recursive: true });
  run(otherClone, "init", "--quiet");
  run(otherClone, "remote", "add", "origin", "https://github.com/fork/repo.git");
  assert.notEqual(resolveRepository(otherClone, defaults).directory, resolvedDefault.directory);
  assert.equal(resolveRepository(otherClone, options).directory, resolved.directory);
  const separate = path.join(temporary, "separate");
  const metadata = path.join(temporary, "metadata", "repo.git");
  mkdirSync(separate);
  mkdirSync(path.dirname(metadata));
  run(separate, "init", "--quiet", `--separate-git-dir=${metadata}`);
  assert.equal(path.dirname(resolveRepository(separate, defaults).directory), path.join(temporary, "skill-config"));
  run(clone, "remote", "add", "other", "https://gitlab.com/other/repo.git");
  assert.throws(() => resolveRepository(clone, options), /Multiple Git remotes/);
  run(repo, "config", "--add", "remote.origin.url", "https://github.com/different/repo.git");
  assert.throws(() => resolveRepository(repo, options), /multiple repository URLs/);
  assert.throws(() => resolveRepository(temporary, options), /Git repository metadata/);
});

test("CLI locates without writing; required config errors do not look like success", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-cli-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  execFileSync("git", ["-C", temporary, "init", "--quiet"], { stdio: "pipe" });
  const script = fileURLToPath(new URL("../skills/engineering/setup-matt-pocock-skills/scripts/repository-config.mjs", import.meta.url));
  const options = { cwd: temporary, env: { ...process.env, MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "config") }, encoding: "utf8", stdio: "pipe" };
  const result = JSON.parse(execFileSync(process.execPath, [script], options));
  assert.equal(result.repositoryRoot.replaceAll("\\", "/"), temporary.replaceAll("\\", "/"));
  assert.deepEqual(readdirSync(temporary), [".git"]);
  assert.throws(() => execFileSync(process.execPath, [script, "tracker"], options), (error) => {
    assert.equal(error.status, 1);
    assert.equal(error.stdout, "");
    assert.match(error.stderr, /Run \/setup-matt-pocock-skills/);
    return true;
  });
  assert.throws(() => execFileSync(process.execPath, [script, "--unknown"], options), /Usage:/);
});

test("CLI works from a symlinked skill install and reads config without changing project artifacts", (t) => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "skills-install-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const repo = path.join(temporary, "project");
  mkdirSync(repo);
  execFileSync("git", ["-C", repo, "init", "--quiet"], { stdio: "pipe" });
  execFileSync("git", ["-C", repo, "remote", "add", "origin", "git@github.com:owner/repo.git"], { stdio: "pipe" });
  const installed = path.join(temporary, "installed skill");
  const source = fileURLToPath(new URL("../skills/engineering/setup-matt-pocock-skills", import.meta.url));
  symlinkSync(source, installed, process.platform === "win32" ? "junction" : "dir");
  const script = path.join(installed, "scripts", "repository-config.mjs");
  const options = { cwd: repo, env: { ...process.env, MATT_POCOCK_SKILLS_CONFIG_HOME: path.join(temporary, "preferences") }, encoding: "utf8", stdio: "pipe" };
  const located = JSON.parse(execFileSync(process.execPath, [script], options));
  mkdirSync(located.directory, { recursive: true });
  for (const [kind, template] of Object.entries({ tracker: "issue-tracker-local.md", labels: "triage-labels.md", domain: "domain.md" })) {
    writeFileSync(located.files[kind], readFileSync(path.join(source, template)));
  }
  const artifacts = { "AGENTS.md": "Existing instructions\n", "CLAUDE.md": "Existing pointer\n", "GLOSSARY.md": "Existing glossary\n" };
  for (const [filename, content] of Object.entries(artifacts)) writeFileSync(path.join(repo, filename), content);
  const result = JSON.parse(execFileSync(process.execPath, [script, "tracker", "labels", "domain"], options));
  assert.equal(result.identity, "github.com/owner/repo");
  assert.equal(result.directory, located.directory);
  assert.match(readFileSync(result.files.tracker, "utf8"), /Local Markdown/);
  for (const [filename, content] of Object.entries(artifacts)) {
    assert.equal(readFileSync(path.join(repo, filename), "utf8"), content);
  }
  assert.deepEqual(readdirSync(repo).sort(), [".git", ...Object.keys(artifacts)].sort());
});

test("one shared bootstrap replaces resolver boilerplate in individual consumers", () => {
  const guide = readFileSync(new URL("../skills/engineering/setup-matt-pocock-skills/REPOSITORY-CONFIG.md", import.meta.url), "utf8");
  assert.match(guide, /One-time user-level bootstrap/);
  assert.match(guide, /no config-kind arguments/);
  assert.match(guide, /Domain configuration is optional/);
  assert.match(guide, /Never infer GitHub or local markdown/);
  assert.match(guide, /Pass these rules, the project directory/);
  const consumers = [
    "engineering/to-spec/SKILL.md", "engineering/to-tickets/SKILL.md",
    "engineering/triage/SKILL.md", "engineering/implement-spec/SKILL.md",
    "engineering/implement/SKILL.md", "engineering/code-review/SKILL.md",
    "engineering/prototype/SKILL.md", "engineering/domain-modeling/SKILL.md",
    "engineering/tdd/SKILL.md", "engineering/diagnosing-bugs/SKILL.md",
    "engineering/improve-codebase-architecture/SKILL.md", "engineering/pr/SKILL.md",
    "engineering/codebase-design/DESIGN-IT-TWICE.md", "productivity/wait-what/SKILL.md",
  ];
  for (const filename of consumers) {
    const content = readFileSync(new URL(`../skills/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, /REPOSITORY-CONFIG\.md|repository-config\.mjs|files\.domain/, filename);
  }
  const wayfinder = readFileSync(new URL("../skills/engineering/wayfinder/SKILL.md", import.meta.url), "utf8");
  assert.doesNotMatch(wayfinder, /default to the local-markdown tracker/);
  assert.match(wayfinder, /If not, stop and tell the user to run/);
});
