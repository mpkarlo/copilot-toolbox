import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateSkillLinks } from "./validate-skill-links.mts";

function fixture(t: test.TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "skill-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "skills", "engineering", "sample-skill");
  const packaged = join(root, "plugins", "copilot-toolbox", "skills", "sample-skill");
  mkdirSync(source, { recursive: true });
  mkdirSync(packaged, { recursive: true });
  mkdirSync(join(root, "skills", "productivity"), { recursive: true });
  mkdirSync(join(root, "docs", "engineering"), { recursive: true });
  mkdirSync(join(root, "docs", "productivity"), { recursive: true });
  writeFileSync(join(source, "SKILL.md"), "[Guide](guide.md)\n");
  writeFileSync(join(source, "guide.md"), "# Guide\n");
  writeFileSync(join(packaged, "SKILL.md"), "[Guide](guide.md)\n");
  writeFileSync(join(packaged, "guide.md"), "# Guide\n");
  writeFileSync(
    join(root, "docs", "engineering", "sample-skill.md"),
    "[Guide](../../skills/engineering/sample-skill/guide.md)\n",
  );
  return root;
}

test("accepts local links in source, docs, and packaged skills", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "skills", "engineering", "sample-skill", "SKILL.md"),
    "[Guide](guide.md)\n[External](https://example.com)\n[Anchor](#section)\n`[Code](missing.md)`\n",
  );

  assert.deepEqual(validateSkillLinks(root), []);
});

test("rejects a broken source link", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "skills", "engineering", "sample-skill", "SKILL.md"),
    "[Missing](missing.md)\n",
  );

  assert.match(validateSkillLinks(root).join("\n"), /Source link.*missing file/);
});

test("rejects a broken documentation link", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "docs", "engineering", "sample-skill.md"),
    "[Missing](missing.md)\n",
  );

  assert.match(validateSkillLinks(root).join("\n"), /Documentation link.*missing file/);
});

test("rejects a packaged link that escapes the plugin", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "plugins", "copilot-toolbox", "skills", "sample-skill", "SKILL.md"),
    "[Outside](../../../../../../outside.md)\n",
  );

  assert.match(validateSkillLinks(root).join("\n"), /Packaged link.*escapes its allowed root/);
});

test("accepts root and dot-prefixed child links but rejects parents and sibling-prefix paths", (t) => {
  const root = fixture(t);
  const pluginRoot = join(root, "plugins", "copilot-toolbox");
  const skillFile = join(pluginRoot, "skills", "sample-skill", "SKILL.md");
  writeFileSync(join(pluginRoot, "..notes.md"), "# Notes\n");
  writeFileSync(skillFile, "[Root](../../)\n[Dot name](../../..notes.md)\n");
  assert.deepEqual(validateSkillLinks(root), []);

  mkdirSync(join(root, "plugins", "copilot-toolbox-extra"));
  for (const target of ["../../../", "../../../copilot-toolbox-extra/"]) {
    writeFileSync(skillFile, `[Outside](${target})\n`);
    assert.match(validateSkillLinks(root).join("\n"), /Packaged link.*escapes its allowed root/);
  }
});

test("rejects a packaged link through a symlink outside the plugin", (t) => {
  const root = fixture(t);
  const externalDirectory = join(root, "external");
  const pluginRoot = join(root, "plugins", "copilot-toolbox");
  mkdirSync(externalDirectory);
  writeFileSync(join(externalDirectory, "outside.md"), "# Outside\n");
  symlinkSync(externalDirectory, join(pluginRoot, "linked-outside"), "junction");
  writeFileSync(
    join(root, "plugins", "copilot-toolbox", "skills", "sample-skill", "SKILL.md"),
    "[Outside](../../linked-outside/outside.md)\n",
  );

  assert.match(
    validateSkillLinks(root).join("\n"),
    /Packaged link.*resolves outside its allowed root/,
  );
});

test("rejects a broken packaged link within the plugin", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "plugins", "copilot-toolbox", "skills", "sample-skill", "SKILL.md"),
    "[Missing](missing.md)\n",
  );

  assert.match(validateSkillLinks(root).join("\n"), /Packaged link.*missing file/);
});
