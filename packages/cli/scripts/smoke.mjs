// End-to-end smoke test: runs the built CLI against the local repo folder
// (CYANOFF_SKILLS_SOURCE) inside a throwaway project + HOME. No network.
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(here, "../dist/src/cli.js");
const repo = path.resolve(here, "../../..");
const tmp = mkdtempSync(path.join(os.tmpdir(), "cyanoff-smoke-"));
const proj = path.join(tmp, "proj");
const home = path.join(tmp, "home");
import { mkdirSync } from "node:fs";
mkdirSync(proj); mkdirSync(home);
const env = { ...process.env, CYANOFF_SKILLS_SOURCE: repo, HOME: home };
const run = (...args) => {
  console.log(`$ cyanoff ${args.join(" ")}`);
  const out = execFileSync("node", [bin, ...args], { cwd: proj, env, encoding: "utf8" });
  process.stdout.write(out);
  return out;
};
run("list");
run("add", "cyanoff-design");
if (!existsSync(path.join(proj, ".claude/skills/cyanoff-design/SKILL.md"))) throw new Error("project install missing");
run("add", "cyanoff-design", "--agent", "cursor");
if (!existsSync(path.join(proj, ".cursor/skills/cyanoff-design/SKILL.md"))) throw new Error("cursor install missing");
run("add", "cyanoff-design", "-g");
if (!existsSync(path.join(home, ".claude/skills/cyanoff-design/SKILL.md"))) throw new Error("global install missing");
run("list", "--installed");
run("update");
run("remove", "cyanoff-design");
run("init", "scratch-skill");
if (!existsSync(path.join(proj, "scratch-skill/SKILL.md"))) throw new Error("init failed");
console.log("\nSMOKE OK");
