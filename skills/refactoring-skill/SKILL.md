---
name: refactoring-skill
description: Use for structural improvements, duplication reduction, boundary cleanup, and behavior-preserving code changes.
---

# Refactoring Skill

Use this when the goal is cleaner structure without changing intended behavior.

Workflow:
1. Preserve current behavior with tests or explicit manual checks.
2. Identify the core duplication or structural problem.
3. Refactor in small steps with stable intermediate states.
4. Improve naming, boundaries, and data flow before adding abstractions.
5. Stop once the original problem is solved.

Rules:
- Refactoring is not a license to redesign everything nearby.
- Smaller safe steps beat clever rewrites.
- If behavior must change too, separate refactor work from feature work when practical.
