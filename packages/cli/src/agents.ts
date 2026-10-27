import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type AgentId = "claude" | "cursor";
export const ALL_AGENTS: AgentId[] = ["claude", "cursor"];

const AGENT_DIR: Record<AgentId, string> = { claude: ".claude", cursor: ".cursor" };

export interface Target {
  agent: AgentId;
  /** Absolute path of the `skills` directory for this agent. */
  dir: string;
}

export interface TargetOptions {
  cwd?: string;
  home?: string;
  global?: boolean;
  /** Explicit agents (`--agent`). When empty, auto-detect. */
  agents?: string[];
  /** For add: fall back to Claude Code when nothing is detected. For others: return only existing. */
  createDefault?: boolean;
}

export function parseAgents(values: string[] | undefined): AgentId[] {
  const out = new Set<AgentId>();
  for (const raw of values ?? []) {
    for (const v of raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
      if (v === "all") ALL_AGENTS.forEach((a) => out.add(a));
      else if (v === "claude" || v === "claude-code") out.add("claude");
      else if (v === "cursor") out.add("cursor");
      else throw new Error(`Unknown agent "${v}". Supported: claude, cursor, all.`);
    }
  }
  return [...out];
}

export function resolveTargets(opts: TargetOptions = {}): Target[] {
  const root = opts.global ? (opts.home ?? os.homedir()) : (opts.cwd ?? process.cwd());
  const mk = (a: AgentId): Target => ({ agent: a, dir: path.join(root, AGENT_DIR[a], "skills") });
  const explicit = parseAgents(opts.agents);
  if (explicit.length) return explicit.map(mk);
  const detected = ALL_AGENTS.filter((a) => existsSync(path.join(root, AGENT_DIR[a])));
  if (detected.length) return detected.map(mk);
  return opts.createDefault ? [mk("claude")] : [];
}
