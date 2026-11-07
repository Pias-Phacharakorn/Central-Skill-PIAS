# Central-Skill-PIAS

## Overview

Central repo of Agent Skills (`SKILL.md`, open standard — agentskills.io) shared across all
PIAS projects and multiple AI tools. It is published as the Claude Code plugin marketplace
`pias-skills`.

Project-specific skills (e.g. `build-addin`, `learnopen-*`) stay in their own project.

## Tech stack

- **Agent Skills** — `SKILL.md` files with `name` + `description` frontmatter
- **Claude Code plugin marketplace** — `.claude-plugin/marketplace.json`
- **Mods (function hooks)** — TypeScript (`.tsx`) hooks modules, checked with
  `claude plugin validate` and `claude plugin test`
- **`npx skills`** for installing the skills into other AI tools

## Project tree

```text
Central-Skill-PIAS/
├── .claude-plugin/
│   └── marketplace.json             # Marketplace manifest (pias-skills)
├── .claude/
│   └── settings.json                # Enables the plugins in this repo
├── plugins/
│   ├── pias-workflow/               # Engineering workflow skills
│   │   ├── .claude-plugin/plugin.json
│   │   └── skills/<skill>/SKILL.md  # One folder per skill, plus its reference files
│   └── usage-bar/                   # Mod: plan-limit bars under the prompt
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json
│       ├── hooks/register.tsx
│       ├── tests/usage-bar.test.tsx
│       └── types/index.d.ts
└── README.md
```

## Plugins

| Plugin | Contents |
|---|---|
| `pias-workflow` | ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, implement-spec, improve-codebase-architecture, pr, prototype, research, resolving-merge-conflicts, retro, sentry-sdk-skill-creator, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents |
| `usage-bar` | Mod (function hooks): prompt footer (desktop) or hint line (terminal) with coloured (green / yellow / red) 5h / 7d plan-limit bars, context fill and reset countdowns |
| `antigravity` | **Third-party**, not PIAS code: [yuting0624/antigravity-for-claude-code](https://github.com/yuting0624/antigravity-for-claude-code) (MIT), pinned to commit `7e9c5fe`. Hands bulk work to the Antigravity CLI (`agy`, Gemini). See [Third-party plugins](#third-party-plugins) |

### Third-party plugins

#### `antigravity`

Listed here by reference, not copied: `marketplace.json` points at the upstream repo at a fixed
`sha`, so connected repos only get code that was reviewed. To take a newer upstream version,
review the diff from `7e9c5fe` first, then bump the `sha`.

- **Enabled in every active PIAS repo** through `"antigravity@pias-skills": true` in each
  repo's `.claude/settings.json`. Don't put it in `~/.claude/settings.json`, and leave it out of
  any repo with client or NDA material: every prompt and file it delegates is sent to Google
  (Gemini).
- **Needs `agy` wherever it runs.** Install the Antigravity CLI and log in to Google on the
  machine. Cloud sessions don't have it, so delegation fails there unless the environment's
  setup script installs and authenticates it. Native Windows can hang; use WSL, macOS or Linux.
- **Hooks run in every session where it's on:** a routing policy at session start and a
  "consider delegating" nudge on bulk-looking prompts. Turn them off with the plugin options
  `coding_policy` and `delegation_nudge` set to `off`.
- **Avoid:** `/media`, which always runs `agy` with `--yolo` (every tool, whole machine,
  over the media file's whole folder); and `agy-migrate --apply` when an MCP server keeps tokens
  in `env`, because it copies that `env` into the Antigravity config. Don't pass `--yolo` to
  `agy-delegate` outside a throwaway branch; upstream's own README says `--sandbox` does not
  contain it.

## Active PIAS repos

The projects in active use. Any task that spans "every repo", such as rolling out a skill change
or running `/setup-matt-pocock-skills` everywhere, covers this list and nothing else.

| Repo | What it is |
|---|---|
| `Central-Skill-PIAS` | This repo: the shared skills marketplace |
| `PIAS_PowerBI-MCP` | Power BI reports (`.pbip`) edited through `powerbi-modeling-mcp` |
| `BIMBOY-Platform` | BIMBOY web BIM platform (React, ThatOpen, Supabase) |
| `BIM-BOY` | BIMBOY marketing and learning site (Next.js, static) |
| `PIAS-RevitAddInC` | BatchRunner, the Revit 2026 add-in (C#) |
| `PIAS-NavisAddIns` | Navisworks Manage 2026 ribbon add-in (C#) |
| `PIAS-Dynamo` | Dynamo graphs and Python scripts for Revit 2026 workflows |
| `PIAS_Blender-MCP` | Blender projects driven through `mcp-for-blender` |
| `LearnRevitAPI` | pyRevit extension (`PIAS_pyrevit.tab`) |
| `04-AI-OPS` | Secretary vault: knowledge base, and the agent that delegates across the other projects |

Every other repo on the account is inactive. Leave it alone unless it is named explicitly.
`batchrunner-releases` is the one to keep in mind: BatchRunner's update check reads
`latest.json` from it.

## Using the skills

### Claude Code (local + cloud)

Add to each project's `.claude/settings.json` and commit:

```json
{
  "extraKnownMarketplaces": {
    "pias-skills": { "source": { "source": "git", "url": "https://github.com/Pias-Phacharakorn/Central-Skill-PIAS.git" } }
  },
  "enabledPlugins": {
    "pias-workflow@pias-skills": true,
    "antigravity@pias-skills": true,
    "usage-bar@pias-skills": true
  }
}
```

- **Local manual install:**
  ```
  /plugin marketplace add https://github.com/Pias-Phacharakorn/Central-Skill-PIAS.git
  /plugin install pias-workflow@pias-skills
  ```
- **One-off install of the mod from a terminal:**
  ```
  /plugin install usage-bar --marketplace Pias-Phacharakorn/Central-Skill-PIAS
  ```
- **Every project on one machine:** put the `extraKnownMarketplaces` + `enabledPlugins` block
  in `~/.claude/settings.json` instead of a project's. Cloud sessions only read the project's
  `.claude/settings.json`.
- **Cloud session:** if skills don't appear in the first session, run `/reload-skills`.

### Other AI tools (Codex, Gemini CLI, Cursor, Copilot, ...)

```
npx skills add Pias-Phacharakorn/Central-Skill-PIAS
```

Pick the target agent(s) when prompted. For cloud agents, put this command in the
environment setup script.

## Developing

### Adding a skill

1. Create `plugins/<plugin>/skills/<new-name>/SKILL.md` (folder name = `name` field,
   lowercase-hyphen).
2. Frontmatter: only `name` + `description` (portable across tools).
3. Write steps as plain actions, not tool names of a specific AI.
4. Bump `version` in that plugin's `plugin.json`.

### Adding a plugin (new domain)

1. Create `plugins/<name>/.claude-plugin/plugin.json` and `plugins/<name>/skills/`.
2. Register it in `.claude-plugin/marketplace.json`.

### Mods (function hooks)

A mod is a plugin whose `hooks/hooks.json` lists a TypeScript hooks module instead of skills.

```
plugins/<mod>/.claude-plugin/plugin.json
plugins/<mod>/hooks/hooks.json          { "modules": ["./register.tsx"] }
plugins/<mod>/hooks/register.tsx
plugins/<mod>/types/index.d.ts           only if it keeps $.state
plugins/<mod>/tests/*.test.tsx
```

Check before pushing: `claude plugin validate plugins/<mod>` and
`claude plugin test plugins/<mod>`.
