# Shaoruu Cursor Skills Plugin

`shaoruu-cursor-skills` is a Cursor plugin that bundles reusable skills for day-to-day agent workflows.

## Included skills

- `debug`: structured logging workflow for reproducible debugging sessions.
- `cloud-agents`: API-driven workflows for launching, monitoring, and applying Cursor Cloud Agent changes.

## Install as a Cursor plugin

1. Open Cursor.
2. Go to `Settings` -> `Plugins`.
3. Install from GitHub using `https://github.com/shaoruu/cursor-skills`.

Plugin layout follows the single-plugin structure documented at https://cursor.com/docs/plugins/building.

## Legacy skill installer

If you still use the standalone skills installer flow:

```bash
npx skills add shaoruu/cursor-skills
```

## License

MIT
