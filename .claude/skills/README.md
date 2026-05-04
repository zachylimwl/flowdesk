# Skills

Skills are reusable Claude Code instruction files that encode repeatable engineering workflows for this project. They are invoked in any Claude Code session with `/skill <name>` and execute within the context of the current working directory.

## What skills are

A skill is a Markdown file that Claude Code loads as a prompt when you invoke it. Unlike one-off instructions typed into the chat, skills are version-controlled, reviewed, and shared across the team. Use them for tasks you run repeatedly — generating a new API endpoint, writing a feature spec, scaffolding tests — where consistency and correctness matter.

## Naming convention

- Lowercase, hyphen-separated, descriptive: `feature-spec`, `api-endpoint`, `test-generation`
- Name the file after what the skill *produces*, not what it *does* (prefer `api-endpoint` over `create-route`)
- File extension: `.md`

## Required header fields

Every skill file must begin with these four comment lines:

```
# Skill: [name]
# Description: [one-line description of what the skill produces]
# Version: [semver, e.g. 1.0.0]
# Last updated: [YYYY-MM-DD]
```

Example:

```
# Skill: api-endpoint
# Description: Scaffolds a Fastify route, service, repository, and Zod schema for a new REST endpoint
# Version: 1.0.0
# Last updated: 2026-05-04
```

## PR requirement

All new skills and changes to existing skills must be reviewed by at least one other engineer before merging. Skills are team configuration — a broken or misleading skill affects everyone who uses it. Treat them with the same scrutiny as application code.

## Testing a skill locally

1. Copy (or move) the skill file to `.claude/skills/`.
2. In a Claude Code session, invoke it: `/skill <name>` (omit the `.md` extension).
3. Verify the output is correct and matches the intent of the skill.
4. Iterate until the output is reliable before opening a PR.

Do not open a PR until you have run the skill at least once end-to-end and confirmed the result.
