export interface SkillMeta {
  name: string;
  description: string;
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSkillName(name: string): boolean {
  return name.length <= 64 && NAME_RE.test(name);
}

export function assertSkillName(name: string): void {
  if (!isValidSkillName(name)) {
    throw new Error(`Invalid skill name "${name}". Use lowercase letters, digits and single hyphens (e.g. my-skill).`);
  }
}

/** Reject path traversal / absolute paths coming from remote trees. */
export function isSafeRelPath(p: string): boolean {
  if (!p || p.startsWith("/") || p.includes("\\") || p.includes("\0")) return false;
  return p.split("/").every((seg) => seg !== ".." && seg !== "." && seg !== "");
}

/**
 * Minimal YAML frontmatter reader: top-level `key: value` pairs, quoted
 * strings, and `>` / `|` block scalars. Enough for SKILL.md (name, description).
 */
export function parseFrontmatter(text: string): Record<string, string> {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!src.startsWith("---\n")) return {};
  const end = src.indexOf("\n---", 4);
  if (end === -1) return {};
  const lines = src.slice(4, end).split("\n");
  const out: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i] ?? "");
    if (!m) continue;
    const key = m[1]!;
    let value = m[2]!.trim();
    if (value === ">" || value === "|" || value === ">-" || value === "|-") {
      const folded = value.startsWith(">");
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+\S|^\s*$/.test(lines[i + 1] ?? "")) {
        parts.push((lines[++i] ?? "").trim());
      }
      value = parts.join(folded ? " " : "\n").trim();
    } else if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function readSkillMeta(skillMd: string, fallbackName: string): SkillMeta {
  const fm = parseFrontmatter(skillMd);
  return { name: fm.name || fallbackName, description: fm.description || "" };
}
