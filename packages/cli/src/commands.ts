import { resolveTargets, type Target } from "./agents.js";
import { installSkill, listInstalled, removeSkill } from "./install.js";
import { scaffoldSkill } from "./scaffold.js";
import { assertSkillName } from "./skill.js";
import type { Source } from "./source.js";

export interface Ctx {
  source: Source;
  cwd: string;
  home?: string;
  out: (line: string) => void;
  err: (line: string) => void;
}

export interface ScopeOpts {
  global?: boolean;
  agents?: string[];
  force?: boolean;
}

const where = (t: Target) => `${t.agent} (${t.dir})`;

export async function cmdList(ctx: Ctx, opts: ScopeOpts & { installed?: boolean }): Promise<void> {
  if (opts.installed) {
    const targets = resolveTargets({ ...opts, cwd: ctx.cwd, home: ctx.home });
    let n = 0;
    for (const t of targets) {
      for (const s of await listInstalled(t.dir)) {
        ctx.out(`${s.name}\t${t.agent}\t${s.marker.source}\t${t.dir}`);
        n++;
      }
    }
    if (!n) ctx.out("No cyanoff skills installed.");
    return;
  }
  const skills = await ctx.source.list();
  if (!skills.length) return ctx.out("No skills found.");
  const w = Math.max(...skills.map((s) => s.name.length));
  for (const s of skills) ctx.out(`${s.name.padEnd(w)}  ${s.description}`);
}

export async function cmdAdd(ctx: Ctx, names: string[], opts: ScopeOpts & { all?: boolean }): Promise<void> {
  let wanted = names;
  if (opts.all) wanted = (await ctx.source.list()).map((s) => s.name);
  if (!wanted.length) throw new Error("Usage: cyanoff add <name...> (or --all)");
  wanted.forEach(assertSkillName);
  const targets = resolveTargets({ ...opts, cwd: ctx.cwd, home: ctx.home, createDefault: true });
  for (const name of wanted) {
    const files = await ctx.source.fetch(name);
    for (const t of targets) {
      const r = await installSkill(t.dir, name, files, ctx.source.label, { force: opts.force });
      ctx.out(`${r === "unchanged" ? "=" : "+"} ${name} ${r} → ${where(t)}`);
    }
  }
}

export async function cmdRemove(ctx: Ctx, names: string[], opts: ScopeOpts): Promise<void> {
  if (!names.length) throw new Error("Usage: cyanoff remove <name...>");
  names.forEach(assertSkillName);
  const targets = resolveTargets({ ...opts, cwd: ctx.cwd, home: ctx.home });
  if (!targets.length) return ctx.out("Nothing to remove (no .claude or .cursor folder found).");
  for (const name of names) {
    let any = false;
    for (const t of targets) {
      const r = await removeSkill(t.dir, name, { force: opts.force });
      if (r === "removed") {
        any = true;
        ctx.out(`- ${name} removed from ${where(t)}`);
      }
    }
    if (!any) ctx.err(`${name}: not installed`);
  }
}

export async function cmdUpdate(ctx: Ctx, names: string[], opts: ScopeOpts): Promise<void> {
  names.forEach(assertSkillName);
  const targets = resolveTargets({ ...opts, cwd: ctx.cwd, home: ctx.home });
  let seen = 0;
  const cache = new Map<string, Awaited<ReturnType<Source["fetch"]>> | null>();
  for (const t of targets) {
    for (const { name } of await listInstalled(t.dir)) {
      if (names.length && !names.includes(name)) continue;
      seen++;
      if (!cache.has(name)) {
        try {
          cache.set(name, await ctx.source.fetch(name));
        } catch {
          cache.set(name, null);
        }
      }
      const files = cache.get(name);
      if (!files) {
        ctx.err(`! ${name}: no longer available in ${ctx.source.label}`);
        continue;
      }
      const r = await installSkill(t.dir, name, files, ctx.source.label, { force: true });
      ctx.out(`${r === "unchanged" ? "=" : "↑"} ${name} ${r === "unchanged" ? "up to date" : "updated"} → ${where(t)}`);
    }
  }
  if (!seen) ctx.out("No cyanoff skills installed.");
}

export async function cmdInit(ctx: Ctx, name: string | undefined): Promise<void> {
  if (!name) throw new Error("Usage: cyanoff init <name>");
  const dir = await scaffoldSkill(ctx.cwd, name);
  ctx.out(`Created ${dir}/SKILL.md`);
}
