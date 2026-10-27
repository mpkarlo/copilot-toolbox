import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
const setupDirectory = "skills/engineering/setup-matt-pocock-skills";
const guide = read(`${setupDirectory}/REPOSITORY-CONFIG.md`);

test("configuration discovery uses one guide without a bundled runtime", () => {
  assert.equal(existsSync(new URL(`../${setupDirectory}/scripts/repository-config.mjs`, import.meta.url)), false);
  assert.match(guide, /No Node\.js, package installation, or bundled executable is needed/);
  assert.match(guide, /git rev-parse --show-toplevel/);
  assert.match(guide, /git rev-parse --git-common-dir/);
  assert.match(guide, /git worktree list --porcelain -z/);
  assert.match(guide, /SHA256.*Create/);
  assert.match(guide, /without a newline or byte-order mark/);
  assert.match(guide, /sha256sum/);
  assert.match(guide, /shasum -a 256/);
  assert.match(guide, /rather than installing software, inventing a hash/);
  for (const filename of [
    "SKILL.md", "issue-tracker-local.md", "issue-tracker-github.md",
    "issue-tracker-gitlab.md", "domain.md", "triage-labels.md",
  ]) {
    assert.doesNotMatch(read(`${setupDirectory}/${filename}`), /files\.(tracker|labels|domain)|repository-config\.mjs/, filename);
  }
});

test("the guide retains repository identity and configuration boundaries", () => {
  for (const requirement of [
    /Multiple remotes without `origin` are ambiguous/,
    /multiple fetch URLs normalise to different identities/,
    /Never include credentials/,
    /first 12 hex characters of SHA-256/,
    /MATT_POCOCK_SKILLS_CONFIG_HOME/,
    /absolute, nonempty path/,
    /main checkout/,
    /bare or has no usable checkout/,
    /Domain configuration is optional/,
    /Never infer GitHub or local markdown/,
    /unreadable, empty or invalid/,
    /Leave legacy files and instruction pointers untouched/,
    /Keep glossaries, ADRs, specs, tickets/,
  ]) assert.match(guide, requirement);
});

test("published configuration paths are generic and relative to the main checkout", () => {
  for (const filename of [
    "README.md",
    "docs/engineering/setup-matt-pocock-skills.md",
    `${setupDirectory}/SKILL.md`,
    `${setupDirectory}/REPOSITORY-CONFIG.md`,
  ]) {
    const content = read(filename);
    assert.match(content, /\.\.\\skill-config\\<owner>-<repo>-<short-hash>/, filename);
    assert.match(content, /\.\.\/skill-config\/<owner>-<repo>-<short-hash>/, filename);
    assert.doesNotMatch(content, /mpkarlo|ea29c2237fcb|C:\\Code\\my-skills|\/home\/me\/code\/my-skills/, filename);
    assert.doesNotMatch(content, /requires Git and Node\.js|bundled resolver|files\.(tracker|labels|domain)/, filename);
  }
});

test("one shared bootstrap replaces resolver boilerplate in individual consumers", () => {
  assert.match(guide, /One-time user-level bootstrap/);
  assert.match(guide, /Pass these rules, the project directory/);
  const setup = read(`${setupDirectory}/SKILL.md`);
  assert.match(setup, /Get explicit confirmation before changing user-level instructions/);
  assert.match(setup, /read the written files to confirm they are readable, nonempty/);
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
    assert.doesNotMatch(read(`skills/${filename}`), /REPOSITORY-CONFIG\.md|repository-config\.mjs|files\.domain/, filename);
  }
  const wayfinder = read("skills/engineering/wayfinder/SKILL.md");
  assert.doesNotMatch(wayfinder, /default to the local-markdown tracker/);
  assert.match(wayfinder, /If not, stop and tell the user to run/);
});
