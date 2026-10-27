import { promises as fs } from "node:fs";
import path from "node:path";
import { assertSkillName } from "./skill.js";

export function skillTemplate(name: string): string {
  return `---
name: ${name}
description: One sentence on what this skill does and when an agent should reach for it.
---

# ${name}

## When to use

Describe the situations where this skill applies (and where it does not).

## Rules

1. State the rule.
   - Why: say what an agent gets wrong by default, and what to do instead.
2. Keep each rule checkable. "Looks good" is not a rule; "duration between 150–300ms" is.

## Checklist

- [ ] Something a reviewer can verify in under a minute
`;
}

/**
 * Create `<base>/<name>/SKILL.md`. `base` is `./skills` when the cwd looks like
 * a skills repo (has a skills/ folder), otherwise the cwd itself.
 */
export async function scaffoldSkill(cwd: string, name: string): Promise<string> {
  assertSkillName(name);
  let base = cwd;
  try {
    if ((await fs.stat(path.join(cwd, "skills"))).isDirectory()) base = path.join(cwd, "skills");
  } catch {
    /* no skills dir */
  }
  const dir = path.join(base, name);
  try {
    await fs.access(dir);
    throw new Error(`${dir} already exists.`);
  } catch (e) {
    if (e instanceof Error && e.message.endsWith("already exists.")) throw e;
  }
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), skillTemplate(name));
  return dir;
}
