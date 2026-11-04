import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const syncScript = fileURLToPath(new URL("./sync-copilot-plugin.mjs", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "copilot-inventory-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of [["scripts"], ["skills", "engineering"], ["skills", "productivity"]]) {
    mkdirSync(join(root, ...directory), { recursive: true });
  }
  copyFileSync(syncScript, join(root, "scripts", "sync-copilot-plugin.mjs"));
  writeFileSync(join(root, "LICENSE"), "Example license\n");
  return root;
}

function addSkill(root, bucket, name) {
  const directory = join(root, "skills", bucket, name);
  mkdirSync(directory);
  writeFileSync(join(directory, "SKILL.md"), `# ${name}\n`);
}

function sync(root, ...args) {
  return spawnSync(process.execPath, [join(root, "scripts", "sync-copilot-plugin.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function assertRejectedWithoutChanges(root, message) {
  const sentinel = join(root, "plugins", "copilot-toolbox", "skills", "existing", "SKILL.md");
  mkdirSync(join(root, "plugins", "copilot-toolbox", "skills", "existing"), { recursive: true });
  writeFileSync(sentinel, "Keep existing output\n");
  for (const args of [[], ["--check"]]) {
    const result = sync(root, ...args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.equal(readFileSync(sentinel, "utf8"), "Keep existing output\n");
  }
}

test("sync discovers only promoted skills without a Claude manifest", (t) => {
  const root = fixture(t);
  addSkill(root, "engineering", "first-skill");
  addSkill(root, "productivity", "second-skill");
  writeFileSync(join(root, "skills", "engineering", "README.md"), "Bucket index\n");
  mkdirSync(join(root, "skills", "engineering", "first-skill", "references"));
  writeFileSync(join(root, "skills", "engineering", "first-skill", "references", "guide.md"), "Guide\n");
  for (const bucket of ["misc", "in-progress", "deprecated"]) {
    mkdirSync(join(root, "skills", bucket, "ignored"), { recursive: true });
  }
  const output = join(root, "plugins", "copilot-toolbox");
  mkdirSync(join(output, "skills", "stale"), { recursive: true });
  writeFileSync(join(output, "skills", "stale", "SKILL.md"), "Stale\n");
  writeFileSync(join(output, "plugin.json"), "Existing manifest\n");

  const result = sync(root);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(output, "skills")).sort(), ["first-skill", "second-skill"]);
  for (const [bucket, name, ...file] of [
    ["engineering", "first-skill", "SKILL.md"],
    ["engineering", "first-skill", "references", "guide.md"],
    ["productivity", "second-skill", "SKILL.md"],
  ]) {
    assert.deepEqual(
      readFileSync(join(output, "skills", name, ...file)),
      readFileSync(join(root, "skills", bucket, name, ...file)),
    );
  }
  assert.equal(readFileSync(join(output, "LICENSE"), "utf8"), "Example license\n");
  assert.equal(readFileSync(join(output, "plugin.json"), "utf8"), "Existing manifest\n");
  assert.equal(sync(root, "--check").status, 0);

  writeFileSync(join(output, "skills", "first-skill", "SKILL.md"), "Out of sync\n");
  const check = sync(root, "--check");
  assert.notEqual(check.status, 0);
  assert.match(check.stderr, /out of sync/i);
});

test("sync rewrites cross-bucket Markdown links for flat output", (t) => {
  const root = fixture(t);
  addSkill(root, "engineering", "guide-skill");
  addSkill(root, "productivity", "wait-what");
  const sourceReference = join(
    root,
    "skills",
    "engineering",
    "guide-skill",
    "REFERENCE.md",
  );
  const sourceSkillDirectory = join(root, "skills", "productivity", "wait-what");
  const sourceSkill = join(sourceSkillDirectory, "SKILL.md");
  writeFileSync(sourceReference, "Reference\n");
  writeFileSync(join(sourceSkillDirectory, "LOCAL.md"), "Local\n");
  writeFileSync(
    sourceSkill,
    "[Guide](../../engineering/guide-skill/REFERENCE.md)\n[Local](./LOCAL.md)\n",
  );

  const result = sync(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(
      join(root, "plugins", "copilot-toolbox", "skills", "wait-what", "SKILL.md"),
      "utf8",
    ),
    "[Guide](../guide-skill/REFERENCE.md)\n[Local](./LOCAL.md)\n",
  );
  assert.equal(
    readFileSync(sourceSkill, "utf8"),
    "[Guide](../../engineering/guide-skill/REFERENCE.md)\n[Local](./LOCAL.md)\n",
  );
  assert.ok(
    existsSync(
      join(
        root,
        "plugins",
        "copilot-toolbox",
        "skills",
        "guide-skill",
        "REFERENCE.md",
      ),
    ),
  );
  assert.equal(sync(root, "--check").status, 0);
});

test("sync preserves code examples and rewrites reference-style link definitions", (t) => {
  const root = fixture(t);
  addSkill(root, "engineering", "guide-skill");
  addSkill(root, "productivity", "wait-what");
  const sourceReference = join(
    root,
    "skills",
    "engineering",
    "guide-skill",
    "REFERENCE.md",
  );
  const sourceSkill = join(root, "skills", "productivity", "wait-what", "SKILL.md");
  writeFileSync(sourceReference, "Reference\n");
  const sourceContent = [
    "[Guide][guide]",
    "[Bracketed](<../../engineering/guide-skill/REFERENCE.md>)",
    "`[Inline example](../../engineering/guide-skill/REFERENCE.md)`",
    "```md",
    "[Block example](../../engineering/guide-skill/REFERENCE.md)",
    "```",
    "[guide]: <../../engineering/guide-skill/REFERENCE.md> \"Guide title\"",
    "",
  ].join("\n");
  writeFileSync(sourceSkill, sourceContent);

  const result = sync(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(
      join(root, "plugins", "copilot-toolbox", "skills", "wait-what", "SKILL.md"),
      "utf8",
    ),
    [
      "[Guide][guide]",
      "[Bracketed](<../guide-skill/REFERENCE.md>)",
      "`[Inline example](../../engineering/guide-skill/REFERENCE.md)`",
      "```md",
      "[Block example](../../engineering/guide-skill/REFERENCE.md)",
      "```",
      "[guide]: <../guide-skill/REFERENCE.md> \"Guide title\"",
      "",
    ].join("\n"),
  );
  assert.equal(readFileSync(sourceSkill, "utf8"), sourceContent);
});

test("sync handles nested and escaped link text and parenthesized paths", (t) => {
  const root = fixture(t);
  addSkill(root, "engineering", "guide-skill");
  addSkill(root, "productivity", "wait-what");
  const referenceDirectory = join(root, "skills", "engineering", "guide-skill");
  const sourceSkill = join(root, "skills", "productivity", "wait-what", "SKILL.md");
  writeFileSync(join(referenceDirectory, "REFERENCE(2).md"), "Reference\n");
  writeFileSync(join(referenceDirectory, "REFERENCE(3).md"), "Reference\n");
  writeFileSync(
    sourceSkill,
    [
      "[Guide [details]](../../engineering/guide-skill/REFERENCE(2).md)",
      "[Guide \\[beta\\]](../../engineering/guide-skill/REFERENCE\\(3\\).md)",
      "",
    ].join("\n"),
  );

  const result = sync(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(
      join(root, "plugins", "copilot-toolbox", "skills", "wait-what", "SKILL.md"),
      "utf8",
    ),
    [
      "[Guide [details]](../guide-skill/REFERENCE(2).md)",
      "[Guide \\[beta\\]](../guide-skill/REFERENCE(3).md)",
      "",
    ].join("\n"),
  );
  assert.equal(sync(root, "--check").status, 0);
});

test("sync rejects duplicate skill names, including case-only differences", (t) => {
  for (const duplicate of ["shared-skill", "Shared-Skill"]) {
    const root = fixture(t);
    addSkill(root, "engineering", "shared-skill");
    addSkill(root, "productivity", duplicate);
    assertRejectedWithoutChanges(root, /skill names must be unique/i);
  }
});

test("sync rejects promoted directories without a SKILL.md file", (t) => {
  for (const shape of ["missing", "directory"]) {
    const root = fixture(t);
    const directory = join(root, "skills", "engineering", "missing-skill");
    mkdirSync(directory);
    if (shape === "directory") mkdirSync(join(directory, "SKILL.md"));
    assertRejectedWithoutChanges(root, /missing SKILL\.md.*missing-skill/i);
  }
});

test("sync rejects promoted symlinks instead of silently omitting skills", (t) => {
  const root = fixture(t);
  const target = join(root, "linked-source");
  mkdirSync(target);
  writeFileSync(join(target, "SKILL.md"), "# linked-skill\n");
  symlinkSync(target, join(root, "skills", "engineering", "linked-skill"), "junction");

  assert.ok(existsSync(join(root, "skills", "engineering", "linked-skill", "SKILL.md")));
  assertRejectedWithoutChanges(root, /skill symlink.*linked-skill/i);
});
