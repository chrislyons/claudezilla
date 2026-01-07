---
description: "Cancel active Claudezilla focus loop"
allowed-tools: ["mcp__claudezilla__firefox_stop_loop", "mcp__claudezilla__firefox_loop_status"]
---

# Cancel Focus Loop

Stop the currently active Claudezilla focus loop.

## Instructions

1. First check if a loop is active using `firefox_loop_status`
2. If active, call `firefox_stop_loop` to cancel it
3. Report the result to the user

The current iteration will complete, then the loop will end and you'll be able to exit normally.
