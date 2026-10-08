# Central-Skill-PIAS

Central repo of Agent Skills (`SKILL.md`, open standard — agentskills.io) shared across all PIAS projects and multiple AI tools.

## Structure
```
.claude-plugin/marketplace.json      Claude Code marketplace manifest
plugins/<plugin>/.claude-plugin/plugin.json
plugins/<plugin>/skills/<skill>/SKILL.md
```

## Use in Claude Code (local + cloud)
Add to each project's `.claude/settings.json` and commit:
```json
{
  "extraKnownMarketplaces": {
    "pias-skills": { "source": { "source": "git", "url": "https://github.com/Pias-Phacharakorn/Central-Skill-PIAS.git" } }
  },
  "enabledPlugins": {
    "pias-workflow@pias-skills": true,
    "usage-bar@pias-skills": true
  }
}
```
Local manual install:
```
/plugin marketplace add https://github.com/Pias-Phacharakorn/Central-Skill-PIAS.git
/plugin install pias-workflow@pias-skills
```
Cloud session: if skills don't appear in the first session, run `/reload-skills`.
Private repo: the Claude GitHub App must have access to this repo.

## Use in other AI tools (Codex, Gemini CLI, Cursor, Copilot, ...)
```
npx skills add Pias-Phacharakorn/Central-Skill-PIAS
```
Pick the target agent(s) when prompted. For cloud agents, put this command in the environment setup script.

## Plugins
| Plugin | Contents |
|---|---|
| `pias-workflow` | ask-matt, caveman, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, improve-codebase-architecture, plan-visualizer, prototype, research, resolving-merge-conflicts, sentry-sdk-skill-creator, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents |
| `usage-bar` | Mod (function hooks): status line under the prompt with green / yellow / red 5h / 7d plan-limit bars, context fill and reset countdowns |

Project-specific skills (e.g. `build-addin`, `learnopen-*`) stay in their own project.

## Adding a skill
1. Create `plugins/<plugin>/skills/<new-name>/SKILL.md` (folder name = `name` field, lowercase-hyphen).
2. Frontmatter: only `name` + `description` (portable across tools).
3. Write steps as plain actions, not tool names of a specific AI.
4. Bump `version` in that plugin's `plugin.json`.

## Adding a plugin (new domain)
1. Create `plugins/<name>/.claude-plugin/plugin.json` and `plugins/<name>/skills/`.
2. Register it in `.claude-plugin/marketplace.json`.

## Mods (function hooks)
A mod is a plugin whose `hooks/hooks.json` lists a TypeScript hooks module instead of skills.
```
plugins/<mod>/.claude-plugin/plugin.json
plugins/<mod>/hooks/hooks.json          { "modules": ["./register.tsx"] }
plugins/<mod>/hooks/register.tsx
plugins/<mod>/types/index.d.ts           only if it keeps $.state
plugins/<mod>/tests/*.test.tsx
```
Check before pushing: `claude plugin validate plugins/<mod>` and `claude plugin test plugins/<mod>`.

Enable everywhere on one machine: put the `extraKnownMarketplaces` + `enabledPlugins` block above in `~/.claude/settings.json` instead of a project's. Cloud sessions only read the project's `.claude/settings.json`.

One-off install from a terminal:
```
/plugin install usage-bar --marketplace Pias-Phacharakorn/Central-Skill-PIAS
```
