---
description: "Explain Claudezilla focus loops and available commands"
allowed-tools: []
---

# Claudezilla Focus Loops

Claudezilla provides persistent iterative development through **focus loops** - allowing Claude to work on a task repeatedly until completion.

## Available Commands

### /focus
Start a focus loop in the current session.

**Usage:**
```
/focus "PROMPT" [--max-iterations N] [--completion-promise TEXT]
```

**Arguments:**
- `PROMPT` - The task to work on (required)
- `--max-iterations N` - Stop after N iterations (default: 20)
- `--completion-promise TEXT` - End loop when `<promise>TEXT</promise>` is output

**Example:**
```
/focus "Build a calculator app with tests" --max-iterations 30 --completion-promise "COMPLETE"
```

### /cancel-focus
Stop the active focus loop.

```
/cancel-focus
```

## How It Works

1. You start a loop with `/focus "your task"`
2. Claude works on the task and eventually tries to exit
3. The Stop hook intercepts the exit attempt
4. Hook queries Claudezilla for loop state
5. If active, hook blocks exit and re-injects the same prompt
6. Claude continues, seeing previous file changes and git history
7. Loop ends when max iterations reached or completion promise output

## Best Practices

1. **Set reasonable max iterations** - Always use `--max-iterations` as a safety net
2. **Clear completion criteria** - Use `--completion-promise` with specific success conditions
3. **Self-correcting prompts** - Include instructions for how to verify success

**Good prompt example:**
```
/focus "Build a REST API with:
- CRUD endpoints for /users
- Input validation
- Tests with >80% coverage

Run tests after each change. Output <promise>COMPLETE</promise> when all tests pass." --max-iterations 25 --completion-promise "COMPLETE"
```

## Requirements

- Claudezilla extension running in Firefox
- Claudezilla MCP server connected
- `jq` and `nc` (netcat) available in PATH

## More Information

See the Claudezilla documentation at https://claudezilla.com/docs
