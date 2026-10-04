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
    "bim-dev@pias-skills": true
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
| `bim-dev` | thatopen-bim-component, thatopen-items-finder, thatopen-ui-section-grids |
| `app-dev` | developing-genkit-*, firebase-*, react-router-framework-mode, xcode-project-setup |

Project-specific skills (e.g. `build-addin`, `learnopen-*`) stay in their own project.

## Adding a skill
1. Create `plugins/<plugin>/skills/<new-name>/SKILL.md` (folder name = `name` field, lowercase-hyphen).
2. Frontmatter: only `name` + `description` (portable across tools).
3. Write steps as plain actions, not tool names of a specific AI.
4. Bump `version` in that plugin's `plugin.json`.

## Adding a plugin (new domain)
1. Create `plugins/<name>/.claude-plugin/plugin.json` and `plugins/<name>/skills/`.
2. Register it in `.claude-plugin/marketplace.json`.
