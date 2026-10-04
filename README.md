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
    "pias-skills": { "source": { "source": "github", "repo": "<OWNER>/Central-Skill-PIAS" } }
  },
  "enabledPlugins": {
    "bim-dev@pias-skills": true
  }
}
```
Local manual install:
```
/plugin marketplace add <OWNER>/Central-Skill-PIAS
/plugin install bim-dev@pias-skills
```
Cloud session: if skills don't appear in the first session, run `/reload-skills`.
Private repo: the Claude GitHub App must have access to this repo.

## Use in other AI tools (Codex, Gemini CLI, Cursor, Copilot, ...)
```
npx skills add <OWNER>/Central-Skill-PIAS
```
Pick the target agent(s) when prompted. For cloud agents, put this command in the environment setup script.

## Adding a skill
1. Copy an `example-*` folder into `plugins/<plugin>/skills/<new-name>/`.
2. Frontmatter: only `name` + `description` (portable across tools).
3. Write steps as plain actions, not tool names of a specific AI.
4. Bump `version` in that plugin's `plugin.json`.

## Adding a plugin (new domain)
1. Create `plugins/<name>/.claude-plugin/plugin.json` and `plugins/<name>/skills/`.
2. Register it in `.claude-plugin/marketplace.json`.
