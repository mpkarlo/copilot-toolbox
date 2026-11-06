import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync } from "node:fs";

const read = (filename) => readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
const assertGuideReference = (filename, reference) => {
  const skillUrl = new URL(`../${filename}`, import.meta.url);
  assert.ok(read(filename).includes(reference), `${filename} is missing the shared guide reference`);
  assert.ok(existsSync(new URL(reference, skillUrl)), `${filename} has an unresolved guide reference`);
};
const setupDirectory = "skills/engineering/cpt-configure";
const setup = read(`${setupDirectory}/SKILL.md`);
const guide = read(`${setupDirectory}/REPOSITORY-CONFIG.md`);
const sharedReference = "../cpt-configure/REPOSITORY-CONFIG.md";
const engineeringConsumers = [
  "ask-matt", "code-review", "diagnosing-bugs", "domain-modeling",
  "implement", "implement-spec", "improve-codebase-architecture", "pr",
  "tdd", "to-spec", "to-tickets", "triage", "wayfinder",
];

test("new setups recommend Local-only mode and preserve existing preferences", () => {
  assert.match(setup, /recommending \*\*Local-only mode\*\*/);
  assert.match(setup, /Keep the mode already used by this repository/);
  assert.match(setup, /If both locations contain preferences, ask which to use/);
  assert.match(setup, /without moving, merging, or deleting files in the previous location/);
  assert.match(setup, /Carry the saved PR\/MR request-surface value into the selected location/);
  assert.match(setup, /Preserve every unmentioned setting and custom instruction/);
  assert.match(setup, /retrieve the complete label list from the verified project/);
  assert.match(setup, /If lookup fails or the result is incomplete, report the error and stop/);
  assert.match(setup, /Do not expose the PR\/MR request-surface setting/);
  assert.match(setup, /plain-language Description/);
  for (const text of [
    "**Project mode:** update only the `## Agent skills` block in the existing `AGENTS.md`.",
    "If `AGENTS.md` does not exist, ask before creating it.",
    "Never update `CLAUDE.md`.",
    "See `docs/agents/issue-tracker.md`.",
    "See `docs/agents/triage-labels.md`.",
    "See `docs/agents/domain.md`.",
    "Skip this section entirely if the `triage` skill isn't installed",
    "Project mode, preserve the original offer to `git mv` legacy artifacts",
  ]) assert.ok(setup.includes(text), text);
});

test("Local-only preferences use one app-agnostic guide and a checkout-local path", () => {
  assert.equal(existsSync(new URL(`../${setupDirectory}/scripts/repository-config.mjs`, import.meta.url)), false);
  assert.match(guide, /`cpt-configure` recommends Local-only mode for a new setup/);
  assert.match(guide, /Use Git and existing file tools/);
  assert.match(guide, /git worktree list --porcelain -z/);
  assert.match(guide, /Missing preferences retain each skill's original behavior/);
  assert.match(guide, /Both locations contain preferences/);
  assert.match(guide, /ask which mode to use/);
  assert.match(guide, /If a selected preference file exists but cannot be read/);
  assert.match(guide, /Use configured glossary, map, and ADR paths/);
  assert.match(guide, /Changing the main checkout folder name or its parent changes the Local-only path/);
  assert.doesNotMatch(guide, /Copilot|repository-level Instructions|app-level instructions|Node\.js|SHA-256|short-hash|MATT_POCOCK_SKILLS_CONFIG_HOME/);
  assert.match(setup, /Local-only mode.*Do not edit project files/s);
});

test("every preference-consuming skill points to the shared guide", () => {
  for (const name of engineeringConsumers) {
    assertGuideReference(`skills/engineering/${name}/SKILL.md`, sharedReference);
  }
  assertGuideReference(
    "skills/productivity/wait-what/SKILL.md",
    "../../engineering/cpt-configure/REPOSITORY-CONFIG.md",
  );
  assertGuideReference("skills/engineering/codebase-design/DESIGN-IT-TWICE.md", sharedReference);
  assert.match(setup, /read \[REPOSITORY-CONFIG\.md\]\(\.\/REPOSITORY-CONFIG\.md\)/);
});

test("consumers keep their existing fallback behavior when Local-only config is absent", () => {
  const wayfinder = read("skills/engineering/wayfinder/SKILL.md");
  assert.match(wayfinder, /If no tracker has been provided, default to the local-markdown tracker/);
  for (const name of ["to-spec", "to-tickets", "implement-spec", "code-review"]) {
    const skill = read(`skills/engineering/${name}/SKILL.md`);
    assert.match(skill, /If not, tell the user to run `\/cpt-configure`/);
  }
});

test("supported installation blocks are Copilot-only and copied verbatim", () => {
  const install = read(".agents/install-block.md");
  const readme = read("README.md");
  const blocks = [...install.matchAll(/<canonical-block name="([^"]+)">\r?\n([\s\S]*?)\r?\n<\/canonical-block>/g)];
  assert.deepEqual(blocks.map((block) => block[1]), ["copilot-app", "copilot", "vscode"]);
  for (const [, name, content] of blocks) {
    assert.ok(readme.includes(content.trim()), `README.md differs from the ${name} install block`);
  }
  const installation = readme.split("## Installation")[1].split("### 2.")[0];
  for (const text of [install, installation]) {
    assert.doesNotMatch(text, /claude plugin|codex plugin|gemini skills|npx skills|\.claude-plugin/);
  }
  assert.match(readme, /categories describe intended invocation/);
  assert.match(readme, /runtime enforcement and skill loading remain unverified/);
  assert.doesNotMatch(readme, /reachable only when you type|reached for automatically by the agent/);
  for (const filename of [
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "scripts/link-skills.sh",
    "CLAUDE.md",
  ]) {
    assert.equal(existsSync(new URL(`../${filename}`, import.meta.url)), false, filename);
  }
});

test("root instructions are a regular file with live policy pointers", () => {
  const instructionsUrl = new URL("../AGENTS.md", import.meta.url);
  assert.equal(lstatSync(instructionsUrl).isSymbolicLink(), false);
  assert.equal(lstatSync(instructionsUrl).isFile(), true);
  const instructions = read("AGENTS.md");
  assert.match(instructions, /^Skills are organized/);
  assert.match(instructions, /Before substantive implementation, follow the issue, review, and completion rules/);
  assert.doesNotMatch(instructions, /claude-plugin|link-skills|claude plugin validate|https:\/\/aihero\.dev/);
  assert.match(instructions, /declares intended invocation/);
  assert.match(instructions, /`disable-model-invocation: true` plus `policy.allow_implicit_invocation: false`/);
  assert.match(instructions, /Runtime enforcement and skill loading remain unverified/);
  assert.doesNotMatch(instructions, /reachable|model- or user-reachable/);
  for (const [, target] of instructions.matchAll(/\]\((\.\/[^)]+)\)/g)) {
    assert.ok(existsSync(new URL(target.split("#")[0], instructionsUrl)), target);
  }
  assert.match(read("docs/agents/issue-tracker.md"), /Commit only on an explicit user request/);
  assert.match(read("CONTRIBUTING.md"), /contributor-request guidance below does not prohibit approved maintainer specs/);
});

test("guide policy follows repository Markdown rather than an external publication template", () => {
  const policy = read(".agents/writing-docs.md");
  assert.match(policy, /Exact headings and section order are not required/);
  assert.match(policy, /revision-relative paths/);
  assert.match(policy, /Expected results, side effects, and limits/);
  assert.match(policy, /State the intended invocation/);
  assert.match(policy, /without claiming runtime enforcement or successful loading/);
  assert.doesNotMatch(policy, /every link is absolute|published at|renders the install widget/);
});
