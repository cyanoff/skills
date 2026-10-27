import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeRelPath, isValidSkillName, parseFrontmatter, readSkillMeta } from "../src/skill.js";

test("skill names", () => {
  assert.ok(isValidSkillName("cyanoff-design"));
  assert.ok(isValidSkillName("a1"));
  for (const bad of ["", "Foo", "a--b", "-a", "a-", "../x", "a/b", "a b"]) assert.equal(isValidSkillName(bad), false, bad);
});

test("safe relative paths", () => {
  assert.ok(isSafeRelPath("SKILL.md"));
  assert.ok(isSafeRelPath("refs/a.md"));
  for (const bad of ["", "/etc/passwd", "../x", "a/../b", "a//b", "a\\b"]) assert.equal(isSafeRelPath(bad), false, bad);
});

test("frontmatter: plain, quoted, folded", () => {
  const md = `---\nname: x\ndescription: "Hello: world"\nother: 'q'\nlong: >\n  one\n  two\n---\n# body`;
  assert.deepEqual(parseFrontmatter(md), { name: "x", description: "Hello: world", other: "q", long: "one two" });
  assert.deepEqual(parseFrontmatter("# no frontmatter"), {});
  assert.deepEqual(readSkillMeta("# none", "fallback"), { name: "fallback", description: "" });
});
