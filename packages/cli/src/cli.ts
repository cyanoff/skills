#!/usr/bin/env node
import { parseArgs } from "node:util";
import { cmdAdd, cmdInit, cmdList, cmdRemove, cmdUpdate, type Ctx } from "./commands.js";
import { resolveSource } from "./source.js";

const HELP = `cyanoff — install and manage cyanoff agent skills

Usage
  cyanoff list [--installed]            List skills in cyanoff/skills (or installed ones)
  cyanoff add <name...> | --all         Install skills
  cyanoff remove <name...>              Remove installed skills
  cyanoff update [name...]              Update installed skills to the latest version
  cyanoff init <name>                   Scaffold a new skill (skills/<name>/SKILL.md)

Options
  -g, --global          Use ~/.claude/skills and ~/.cursor/skills instead of the project
  -a, --agent <name>    claude | cursor | all (repeatable). Default: auto-detect,
                        falling back to Claude Code (.claude/skills)
  -f, --force           Overwrite / remove folders not installed by cyanoff
      --all             (add) install every skill
      --installed       (list) show installed skills instead of the remote index
  -h, --help            Show help
  -v, --version         Show version

Environment
  CYANOFF_SKILLS_SOURCE  Path to a local checkout (uses <path>/skills) instead of GitHub
  CYANOFF_REPO           GitHub repo to read from (default: cyanoff/skills)
  CYANOFF_REF            Branch or tag (default: main)
  GITHUB_TOKEN           Optional, raises the GitHub API rate limit
`;

export async function main(argv: string[], ctxOverride?: Partial<Ctx>): Promise<number> {
  const ctx: Ctx = {
    source: resolveSource(),
    cwd: process.cwd(),
    out: (l) => console.log(l),
    err: (l) => console.error(l),
    ...ctxOverride,
  };
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        global: { type: "boolean", short: "g" },
        agent: { type: "string", short: "a", multiple: true },
        force: { type: "boolean", short: "f" },
        all: { type: "boolean" },
        installed: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
    const [cmd, ...rest] = positionals;
    if (values.version) {
      const pkg = (await import("node:module")).createRequire(import.meta.url)("../../package.json") as { version: string };
      ctx.out(pkg.version);
      return 0;
    }
    if (values.help || !cmd || cmd === "help") {
      ctx.out(HELP);
      return 0;
    }
    const scope = { global: values.global, agents: values.agent, force: values.force };
    switch (cmd) {
      case "list":
      case "ls":
        await cmdList(ctx, { ...scope, installed: values.installed });
        break;
      case "add":
      case "install":
        await cmdAdd(ctx, rest, { ...scope, all: values.all });
        break;
      case "remove":
      case "rm":
        await cmdRemove(ctx, rest, scope);
        break;
      case "update":
      case "upgrade":
        await cmdUpdate(ctx, rest, scope);
        break;
      case "init":
        await cmdInit(ctx, rest[0]);
        break;
      default:
        ctx.err(`Unknown command "${cmd}".\n`);
        ctx.err(HELP);
        return 1;
    }
    return 0;
  } catch (e) {
    ctx.err(`error: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const entry = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
