---
description: "Start a Claudezilla focus loop for iterative development"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["mcp__claudezilla__firefox_start_loop", "mcp__claudezilla__firefox_loop_status"]
hide-from-slash-command-tool: "true"
---

# Focus Loop Command

Start a Claudezilla focus loop. This command wraps the `firefox_start_loop` MCP tool for convenient iterative development.

## Arguments

Parse the provided arguments:
- `PROMPT` - The task to work on iteratively (required)
- `--max-iterations N` - Maximum iterations before stopping (default: 20)
- `--completion-promise TEXT` - Text that signals completion when output as `<promise>TEXT</promise>`

## Instructions

1. Parse the arguments from: $ARGUMENTS
2. Call `firefox_start_loop` with the parsed prompt, maxIterations, and completionPromise
3. Begin working on the task

## Starting the Loop

Use the `firefox_start_loop` MCP tool with the parsed arguments. If no max-iterations is specified, use 20 as the default.

After starting the loop, work on the task. When you try to exit, the Stop hook will intercept and re-inject the same prompt, allowing you to iterate on your previous work. You'll see your file changes and git history from previous iterations.

CRITICAL: If a completion promise is set, you may ONLY output it (as `<promise>YOUR_PROMISE</promise>`) when the task is genuinely complete. Do not output false promises to escape the loop.

## Example

```
/focus "Build a REST API with tests" --max-iterations 30 --completion-promise "ALL_TESTS_PASS"
```

This starts a focus loop that continues until either 30 iterations complete or you output `<promise>ALL_TESTS_PASS</promise>`.
