---
name: git-workflow-repo-hygiene
description: Use for repository hygiene, change isolation, commit discipline, ignores, and release-safe working practices.
---

# Git Workflow And Repo Hygiene

Use this when organizing changes or cleaning up repository practice.

Workflow:
1. Keep generated artifacts, secrets, and local data out of version control.
2. Isolate unrelated changes instead of bundling everything into one edit set.
3. Prefer deterministic setup docs and scripts over tribal knowledge.
4. Review ignores for WordPress uploads, database files, and frontend build output.
5. Leave the tree easier to reason about than you found it.

Rules:
- A clean repo structure reduces production mistakes.
- Generated `dist/` output and local WordPress database state should be intentional if tracked at all.
- Hygiene includes naming, layout, documentation, and rollback clarity.
