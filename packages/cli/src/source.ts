import { promises as fs } from "node:fs";
import path from "node:path";
import { isSafeRelPath, isValidSkillName, readSkillMeta, type SkillMeta } from "./skill.js";

export interface SkillFile {
  /** POSIX-style path relative to the skill folder, e.g. "SKILL.md". */
  path: string;
  content: Buffer;
}

export interface Source {
  /** Human-readable origin, stored in the install marker. */
  readonly label: string;
  list(): Promise<SkillMeta[]>;
  fetch(name: string): Promise<SkillFile[]>;
}

export const DEFAULT_REPO = "cyanoff/skills";
export const DEFAULT_REF = "main";

/** Reads `<root>/skills/<name>/**` from a local checkout. */
export class LocalSource implements Source {
  readonly label: string;
  constructor(private readonly root: string) {
    this.label = `local:${path.resolve(root)}`;
  }

  private get skillsDir(): string {
    return path.join(this.root, "skills");
  }

  async list(): Promise<SkillMeta[]> {
    let entries;
    try {
      entries = await fs.readdir(this.skillsDir, { withFileTypes: true });
    } catch {
      throw new Error(`No skills/ folder found in ${path.resolve(this.root)}`);
    }
    const out: SkillMeta[] = [];
    for (const e of entries) {
      if (!e.isDirectory() || !isValidSkillName(e.name)) continue;
      try {
        const md = await fs.readFile(path.join(this.skillsDir, e.name, "SKILL.md"), "utf8");
        out.push(readSkillMeta(md, e.name));
      } catch {
        /* not a skill folder */
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetch(name: string): Promise<SkillFile[]> {
    const base = path.join(this.skillsDir, name);
    try {
      await fs.access(path.join(base, "SKILL.md"));
    } catch {
      throw new Error(`Skill "${name}" not found.`);
    }
    const files: SkillFile[] = [];
    const walk = async (dir: string, rel: string): Promise<void> => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(path.join(dir, e.name), r);
        else if (e.isFile()) files.push({ path: r, content: await fs.readFile(path.join(dir, e.name)) });
      }
    };
    await walk(base, "");
    return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
}

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

/** GitHub tree API for the index, raw.githubusercontent.com for file bodies. */
export class GithubSource implements Source {
  readonly label: string;
  private tree?: string[];

  constructor(
    private readonly repo: string = DEFAULT_REPO,
    private readonly ref: string = DEFAULT_REF,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly token: string | undefined = process.env.GITHUB_TOKEN,
  ) {
    this.label = `${repo}@${ref}`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "user-agent": "cyanoff-cli", accept: "application/vnd.github+json" };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    return h;
  }

  private async paths(): Promise<string[]> {
    if (this.tree) return this.tree;
    const url = `https://api.github.com/repos/${this.repo}/git/trees/${encodeURIComponent(this.ref)}?recursive=1`;
    const res = await this.fetchImpl(url, { headers: this.headers() });
    if (res.status === 404) {
      throw new Error(`Could not find ${this.repo}@${this.ref} on GitHub (is the repo public and pushed?).`);
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error("GitHub API rate limit reached. Set GITHUB_TOKEN to raise the limit.");
    }
    if (!res.ok) throw new Error(`GitHub API error ${res.status} for ${this.repo}.`);
    const body = (await res.json()) as { tree?: { path: string; type: string }[] };
    this.tree = (body.tree ?? []).filter((t) => t.type === "blob").map((t) => t.path);
    return this.tree;
  }

  private async raw(p: string): Promise<Buffer> {
    const url = `https://raw.githubusercontent.com/${this.repo}/${encodeURIComponent(this.ref)}/${p
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const res = await this.fetchImpl(url, { headers: { "user-agent": "cyanoff-cli" } });
    if (!res.ok) throw new Error(`Failed to download ${p} (HTTP ${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }

  async list(): Promise<SkillMeta[]> {
    const names = (await this.paths())
      .map((p) => /^skills\/([^/]+)\/SKILL\.md$/.exec(p)?.[1])
      .filter((n): n is string => !!n && isValidSkillName(n));
    const metas = await Promise.all(
      names.map(async (n) => readSkillMeta((await this.raw(`skills/${n}/SKILL.md`)).toString("utf8"), n)),
    );
    return metas.sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetch(name: string): Promise<SkillFile[]> {
    const prefix = `skills/${name}/`;
    const paths = (await this.paths()).filter((p) => p.startsWith(prefix));
    if (!paths.includes(`${prefix}SKILL.md`)) throw new Error(`Skill "${name}" not found in ${this.repo}.`);
    const files = await Promise.all(
      paths.map(async (p) => ({ path: p.slice(prefix.length), content: await this.raw(p) })),
    );
    for (const f of files) if (!isSafeRelPath(f.path)) throw new Error(`Unsafe path in skill: ${f.path}`);
    return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
}

/**
 * Source selection:
 *   CYANOFF_SKILLS_SOURCE=/path/to/checkout  → local folder (smoke tests, offline dev)
 *   CYANOFF_REPO=owner/repo, CYANOFF_REF=ref → another GitHub repo/branch
 */
export function resolveSource(env: NodeJS.ProcessEnv = process.env): Source {
  if (env.CYANOFF_SKILLS_SOURCE) return new LocalSource(env.CYANOFF_SKILLS_SOURCE);
  return new GithubSource(env.CYANOFF_REPO || DEFAULT_REPO, env.CYANOFF_REF || DEFAULT_REF);
}
