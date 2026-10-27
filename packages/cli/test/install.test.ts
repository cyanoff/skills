import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveTargets, parseAgents } from "../src/agents.js";
import { MARKER, hashFiles, installSkill, listInstalled, removeSkill } from "../src/install.js";
import type { SkillFile } from "../src/source.js";

const files = (body = "x"): SkillFile[] => [
  { path: "SKILL.md", content: Buffer.from(`---\nname: demo\ndescription: d\n---\n${body}`) },
  { path: "refs/a.md", content: Buffer.from("a") },
];
const tmp = () => fs.mkdtemp(path.join(os.tmpdir(), "cyanoff-test-"));

test("install, unchanged, update, remove", async () => {
  const dir = path.join(await tmp(), "skills");
  assert.equal(await installSkill(dir, "demo", files(), "src"), "installed");
  assert.ok((await fs.readFile(path.join(dir, "demo/refs/a.md"), "utf8")) === "a");
  assert.equal(await installSkill(dir, "demo", files(), "src"), "unchanged");
  assert.equal(await installSkill(dir, "demo", files("y"), "src"), "updated");
  assert.deepEqual((await listInstalled(dir)).map((s) => s.name), ["demo"]);
  assert.equal(await removeSkill(dir, "demo"), "removed");
  assert.equal(await removeSkill(dir, "demo"), "missing");
});

test("refuses to touch folders it does not own unless forced", async () => {
  const dir = path.join(await tmp(), "skills");
  await fs.mkdir(path.join(dir, "demo"), { recursive: true });
  await fs.writeFile(path.join(dir, "demo/SKILL.md"), "mine");
  await assert.rejects(installSkill(dir, "demo", files(), "src"), /not installed by cyanoff/);
  await assert.rejects(removeSkill(dir, "demo"), /not installed by cyanoff/);
  assert.equal(await installSkill(dir, "demo", files(), "src", { force: true }), "updated");
  assert.ok((await fs.readdir(path.join(dir, "demo"))).includes(MARKER));
});

test("rejects unsafe paths and missing SKILL.md", async () => {
  const dir = path.join(await tmp(), "skills");
  await assert.rejects(installSkill(dir, "demo", [...files(), { path: "../evil", content: Buffer.from("") }], "s"), /Unsafe/);
  await assert.rejects(installSkill(dir, "demo", [{ path: "a.md", content: Buffer.from("") }], "s"), /no SKILL.md/);
  await assert.rejects(installSkill(dir, "../demo", files(), "s"), /Invalid skill name/);
});

test("hash is order independent", () => {
  assert.equal(hashFiles(files()), hashFiles([...files()].reverse()));
});

test("target resolution: default, detect, explicit, global", async () => {
  const cwd = await tmp();
  const home = await tmp();
  assert.deepEqual(resolveTargets({ cwd, home }), []);
  assert.deepEqual(resolveTargets({ cwd, home, createDefault: true }).map((t) => t.dir), [path.join(cwd, ".claude/skills")]);
  await fs.mkdir(path.join(cwd, ".cursor"));
  assert.deepEqual(resolveTargets({ cwd, home }).map((t) => t.agent), ["cursor"]);
  assert.deepEqual(resolveTargets({ cwd, home, agents: ["all"] }).map((t) => t.agent), ["claude", "cursor"]);
  assert.deepEqual(resolveTargets({ cwd, home, global: true, agents: ["claude"] }).map((t) => t.dir), [path.join(home, ".claude/skills")]);
  assert.throws(() => parseAgents(["vim"]), /Unknown agent/);
});
