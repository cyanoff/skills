import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { GithubSource, LocalSource } from "../src/source.js";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cyanoff-src-"));
  await fs.mkdir(path.join(root, "skills/alpha/refs"), { recursive: true });
  await fs.mkdir(path.join(root, "skills/not-a-skill"), { recursive: true });
  await fs.writeFile(path.join(root, "skills/alpha/SKILL.md"), "---\nname: alpha\ndescription: first\n---\nbody");
  await fs.writeFile(path.join(root, "skills/alpha/refs/x.md"), "x");
  return root;
}

test("LocalSource lists and fetches", async () => {
  const s = new LocalSource(await fixture());
  assert.deepEqual(await s.list(), [{ name: "alpha", description: "first" }]);
  assert.deepEqual((await s.fetch("alpha")).map((f) => f.path), ["SKILL.md", "refs/x.md"]);
  await assert.rejects(s.fetch("nope"), /not found/);
});

test("GithubSource uses tree + raw (mocked fetch)", async () => {
  const calls: string[] = [];
  const bodies: Record<string, string> = {
    "https://raw.githubusercontent.com/o/r/main/skills/alpha/SKILL.md": "---\nname: alpha\ndescription: first\n---\n",
    "https://raw.githubusercontent.com/o/r/main/skills/alpha/refs/x.md": "x",
  };
  const fakeFetch = async (url: string) => {
    calls.push(url);
    if (url.startsWith("https://api.github.com/repos/o/r/git/trees/main")) {
      const tree = ["README.md", "skills/alpha/SKILL.md", "skills/alpha/refs/x.md", "skills/junk/readme.md"].map((p) => ({ path: p, type: "blob" }));
      return { ok: true, status: 200, json: async () => ({ tree }), arrayBuffer: async () => new ArrayBuffer(0) };
    }
    const b = bodies[url];
    return { ok: !!b, status: b ? 200 : 404, json: async () => ({}), arrayBuffer: async () => new Uint8Array(Buffer.from(b ?? "")).buffer as ArrayBuffer };
  };
  const s = new GithubSource("o/r", "main", fakeFetch, undefined);
  assert.deepEqual(await s.list(), [{ name: "alpha", description: "first" }]);
  const files = await s.fetch("alpha");
  assert.deepEqual(files.map((f) => [f.path, f.content.toString()]), [["SKILL.md", "---\nname: alpha\ndescription: first\n---\n"], ["refs/x.md", "x"]]);
  assert.equal(calls.filter((c) => c.includes("api.github.com")).length, 1, "tree is cached");
  await assert.rejects(s.fetch("junk"), /not found/);
});

test("GithubSource explains 404 and rate limits", async () => {
  const mk = (status: number) => new GithubSource("o/r", "main", async () => ({ ok: false, status, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) }), undefined);
  await assert.rejects(mk(404).list(), /Could not find o\/r@main/);
  await assert.rejects(mk(403).list(), /rate limit/);
});
