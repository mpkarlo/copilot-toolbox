import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkDiscovery, checkWarnings } from "./check-cli-compatibility.mts";

test("blocks warnings except the exact deferred tag-protection advisory", () => {
  checkWarnings("Dry run complete.\n");
  checkWarnings("warning\t\tno active tag protection rulesets found. Consider protecting tags to ensure immutable releases (Settings > Rules > Rulesets)\n");
  assert.throws(() => checkWarnings("warning\t\tmissing license"), /Blocking CLI warning/);
  assert.throws(() => checkWarnings("WARNING: plugin could not load"), /Blocking CLI warning/);
});

test("requires every expected skill to be enabled and loaded from the local bundle", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cli-discovery-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, "sample");
  mkdirSync(path);
  const skill = { name: "sample", source: "plugin", enabled: true, path };
  checkDiscovery([skill], ["sample"], root);
  assert.throws(() => checkDiscovery([], ["sample"], root));
  assert.throws(() => checkDiscovery([skill, skill], ["sample"], root));
  assert.throws(() => checkDiscovery([{ ...skill, enabled: false }], ["sample"], root));
  assert.throws(() => checkDiscovery([{ ...skill, path: root }], ["sample"], root));
});
