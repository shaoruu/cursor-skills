# Cursor Skills

A collection of skills for AI coding agents.

## Installation

```bash
npx skills add shaoruu/cursor-skills
```

## Available Skills

### debug

Debug code by adding structured logging. Starts a local HTTP server for browser/remote logging and optionally a live log viewer.

**Use when:**
- Debugging issues or tracking down bugs
- You say `/debug`
- You need to log from browser-side code

**Features:**
- Unique session IDs to avoid log conflicts
- HTTP server for browser-side logging (CORS enabled)
- Live log viewer with auto-scroll and JSON pretty-printing
- Multi-language support (Rust, Node.js, Python, etc.)

## License

MIT
