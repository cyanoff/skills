# cyanoff skills

Skills for planning and design thinking that don't look like AI defaults.

Agents don't have taste. Left alone they produce the average of everything they've seen: the same gradient hero, the same `ease-in` entrance, the same three-column grid. Each skill here names one of those defaults, says why it's wrong, and gives a rule you can check. Say it like a surname: *Cyanoff*. It leans on education and math: precise, calm, show-your-work.

## Install

With the open `skills` CLI (Claude Code, Cursor and many other agents):

```bash
npx skills@latest add cyanoff/skills
```

Or with the cyanoff CLI, which only does this one thing:

```bash
npx @cyanoff/skills add cyanoff-design          # → ./.claude/skills
npx @cyanoff/skills add cyanoff-design -g       # → ~/.claude/skills
npx @cyanoff/skills add cyanoff-design -a cursor  # → ./.cursor/skills
```

## Skills

- **[cyanoff-design](./skills/cyanoff-design/SKILL.md)**: design-taste rules. Start from references (Mobbin), use design-system tokens (SEED) instead of raw values, set Korean type properly with Pretendard, keep motion steady, keep sound soft and optional, and delete the patterns that give AI work away.

## CLI

```
cyanoff list [--installed]        List skills in cyanoff/skills (or the ones installed)
cyanoff add <name...> | --all     Install skills
cyanoff remove <name...>          Remove installed skills
cyanoff update [name...]          Update installed skills to the latest main
cyanoff init <name>               Scaffold skills/<name>/SKILL.md
```

| Flag | Meaning |
| --- | --- |
| `-g`, `--global` | Use `~/.claude/skills` / `~/.cursor/skills` instead of the current project |
| `-a`, `--agent` | `claude`, `cursor` or `all` (repeatable). Default: auto-detect existing `.claude` / `.cursor`, falling back to Claude Code |
| `-f`, `--force` | Overwrite or remove folders that cyanoff didn't install |

How it works: the index comes from the GitHub tree API for `cyanoff/skills@main` and files from `raw.githubusercontent.com`. There are no runtime dependencies. Each installed skill carries a small `.cyanoff.json` marker (source and content hash). `update` and `remove` only touch folders with that marker unless you pass `--force`, so your hand-written skills are safe.

Environment variables:

| Variable | Effect |
| --- | --- |
| `CYANOFF_SKILLS_SOURCE` | Path to a local checkout; reads `<path>/skills`. Useful offline and for tests |
| `CYANOFF_REPO` / `CYANOFF_REF` | Read from another GitHub repo or branch (default `cyanoff/skills` / `main`) |
| `GITHUB_TOKEN` | Optional; raises the GitHub API rate limit |

## Write a skill

```bash
npx @cyanoff/skills init my-skill     # creates skills/my-skill/SKILL.md
```

A skill is `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) and any supporting files next to it. The name is lowercase with hyphens. The description says what it does *and when to use it*, because that's what the agent reads to decide. Keep rules checkable: "150–300ms" beats "feels fast".

## Develop

```bash
npm install
npm run build
npm test      # build + node:test
npm run smoke # runs the built CLI against this checkout (no network)
```

Requires Node 20+.

## 한국어

AI의 기본값과 다른 기획·디자인 판단을 모아 둔 스킬 저장소예요. 에이전트는 안목이 없어서, 그냥 두면 어디서 본 듯한 평균적인 결과물을 만들어요. 각 스킬은 그 "기본값"을 하나씩 짚고, 확인할 수 있는 규칙으로 바꿔 줘요.

```bash
npx skills@latest add cyanoff/skills        # 전체 설치
npx @cyanoff/skills add cyanoff-design      # 하나만 설치 (현재 프로젝트의 .claude/skills)
npx @cyanoff/skills add cyanoff-design -g   # 전역 설치 (~/.claude/skills)
npx @cyanoff/skills add cyanoff-design -a cursor  # Cursor
```

`list`, `remove`, `update`, `init <이름>` 명령도 있어요. 새 스킬은 `npx @cyanoff/skills init 이름`으로 뼈대를 만들고, `skills/<이름>/SKILL.md`에 규칙을 쓰면 돼요.

## License

[MIT](./LICENSE)
