import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { main } from "../src/cli.js";
import { LocalSource } from "../src/source.js";

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cyanoff-cli-"));
  const repo = path.join(root, "repo");
  const cwd = path.join(root, "proj");
  const home = path.join(root, "home");
  await fs.mkdir(path.join(repo, "skills/alpha"), { recursive: true });
  await fs.mkdir(cwd);
  await fs.mkdir(home);
  const write = (body: string) => fs.writeFile(path.join(repo, "skills/alpha/SKILL.md"), `---\nname: alpha\ndescription: first\n---\n${body}`);
  await write("v1");
  const out: string[] = [];
  const err: string[] = [];
  const run = (args: string[]) => main(args, { source: new LocalSource(repo), cwd, home, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { repo, cwd, home, out, err, run, write };
}

test("add → list --installed → update → remove (project, claude default)", async () => {
  const t = await setup();
  assert.equal(await t.run(["add", "alpha"]), 0);
  const installed = path.join(t.cwd, ".claude/skills/alpha/SKILL.md");
  assert.match(await fs.readFile(installed, "utf8"), /v1/);

  t.out.length = 0;
  assert.equal(await t.run(["list", "--installed"]), 0);
  assert.match(t.out.join("\n"), /^alpha\tclaude/m);

  await t.write("v2");
  t.out.length = 0;
  assert.equal(await t.run(["update"]), 0);
  assert.match(t.out.join("\n"), /updated/);
  assert.match(await fs.readFile(installed, "utf8"), /v2/);
  t.out.length = 0;
  await t.run(["update"]);
  assert.match(t.out.join("\n"), /up to date/);

  assert.equal(await t.run(["remove", "alpha"]), 0);
  await assert.rejects(fs.access(installed));
});

test("add --agent cursor and -g", async () => {
  const t = await setup();
  assert.equal(await t.run(["add", "alpha", "--agent", "cursor"]), 0);
  await fs.access(path.join(t.cwd, ".cursor/skills/alpha/SKILL.md"));
  assert.equal(await t.run(["add", "alpha", "-g", "-a", "all"]), 0);
  await fs.access(path.join(t.home, ".claude/skills/alpha/SKILL.md"));
  await fs.access(path.join(t.home, ".cursor/skills/alpha/SKILL.md"));
});

test("errors return exit code 1", async () => {
  const t = await setup();
  assert.equal(await t.run(["add", "missing"]), 1);
  assert.equal(await t.run(["add"]), 1);
  assert.equal(await t.run(["add", "Bad Name"]), 1);
  assert.equal(await t.run(["bogus"]), 1);
  assert.equal(await t.run(["add", "alpha", "-a", "vim"]), 1);
});

test("init scaffolds a valid skill", async () => {
  const t = await setup();
  assert.equal(await t.run(["init", "my-skill"]), 0);
  const md = await fs.readFile(path.join(t.cwd, "my-skill/SKILL.md"), "utf8");
  assert.match(md, /^---\nname: my-skill\ndescription:/);
  assert.equal(await t.run(["init", "my-skill"]), 1);
  await fs.mkdir(path.join(t.cwd, "skills"));
  assert.equal(await t.run(["init", "other"]), 0);
  await fs.access(path.join(t.cwd, "skills/other/SKILL.md"));
});

test("help and version", async () => {
  const t = await setup();
  assert.equal(await t.run([]), 0);
  assert.match(t.out.join("\n"), /Usage/);
  t.out.length = 0;
  assert.equal(await t.run(["--version"]), 0);
  assert.match(t.out[0]!, /^\d+\.\d+\.\d+/);
});
