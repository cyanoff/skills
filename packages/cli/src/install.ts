import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { assertSkillName, isSafeRelPath } from "./skill.js";
import type { SkillFile } from "./source.js";

export const MARKER = ".cyanoff.json";

export interface Marker {
  source: string;
  hash: string;
  installedAt: string;
}

export function hashFiles(files: SkillFile[]): string {
  const h = createHash("sha256");
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    h.update(f.path).update("\0").update(f.content).update("\0");
  }
  return h.digest("hex").slice(0, 16);
}

export async function readMarker(skillDir: string): Promise<Marker | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(skillDir, MARKER), "utf8")) as Marker;
  } catch {
    return null;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export type InstallResult = "installed" | "updated" | "unchanged";

/**
 * Write a skill into `<targetDir>/<name>`. Replaces the folder atomically-ish
 * (write to temp, swap). Refuses to overwrite folders not created by cyanoff
 * unless `force` is set.
 */
export async function installSkill(
  targetDir: string,
  name: string,
  files: SkillFile[],
  source: string,
  opts: { force?: boolean } = {},
): Promise<InstallResult> {
  assertSkillName(name);
  for (const f of files) if (!isSafeRelPath(f.path)) throw new Error(`Unsafe path in skill: ${f.path}`);
  if (!files.some((f) => f.path === "SKILL.md")) throw new Error(`Skill "${name}" has no SKILL.md.`);

  const dest = path.join(targetDir, name);
  const hash = hashFiles(files);
  const present = await exists(dest);
  const marker = present ? await readMarker(dest) : null;
  if (present && !marker && !opts.force) {
    throw new Error(`${dest} already exists and was not installed by cyanoff. Use --force to overwrite.`);
  }
  if (marker && marker.hash === hash) return "unchanged";

  await fs.mkdir(targetDir, { recursive: true });
  const tmp = path.join(targetDir, `.${name}.tmp-${process.pid}`);
  await fs.rm(tmp, { recursive: true, force: true });
  for (const f of files) {
    const out = path.join(tmp, ...f.path.split("/"));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, f.content);
  }
  const m: Marker = { source, hash, installedAt: new Date().toISOString() };
  await fs.writeFile(path.join(tmp, MARKER), JSON.stringify(m, null, 2) + "\n");
  if (present) await fs.rm(dest, { recursive: true, force: true });
  await fs.rename(tmp, dest);
  return present ? "updated" : "installed";
}

export async function removeSkill(targetDir: string, name: string, opts: { force?: boolean } = {}): Promise<"removed" | "missing"> {
  assertSkillName(name);
  const dest = path.join(targetDir, name);
  if (!(await exists(dest))) return "missing";
  if (!(await readMarker(dest)) && !opts.force) {
    throw new Error(`${dest} was not installed by cyanoff. Use --force to remove it anyway.`);
  }
  await fs.rm(dest, { recursive: true, force: true });
  return "removed";
}

/** Skills in `targetDir` that carry a cyanoff marker. */
export async function listInstalled(targetDir: string): Promise<{ name: string; marker: Marker }[]> {
  let entries;
  try {
    entries = await fs.readdir(targetDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: { name: string; marker: Marker }[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    const marker = await readMarker(path.join(targetDir, e.name));
    if (marker) out.push({ name: e.name, marker });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
