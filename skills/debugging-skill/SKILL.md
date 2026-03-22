---
name: debugging-skill
description: Use for reproducing issues, isolating root causes, narrowing hypotheses, and verifying fixes.
---

# Debugging Skill

Use this when behavior is broken, inconsistent, or poorly understood.

Workflow:
1. Reproduce the issue reliably.
2. Narrow the failing layer: data, API, rendering, state, environment, or configuration.
3. Inspect the smallest set of code paths that can explain the failure.
4. Validate the root cause before patching.
5. Re-test the original scenario and adjacent regressions after the fix.

Rules:
- Do not patch symptoms before understanding the cause.
- Logs and breakpoints are evidence, not conclusions.
- A fix is incomplete until the reproduction case is closed.
