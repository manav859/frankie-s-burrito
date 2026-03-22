---
name: staging-production-management
description: Use for environment separation, promotion workflow, staging parity, and production-safe operational practices.
---

# Staging/Production Environment Management

Use this when the task depends on environment-specific behavior.

Workflow:
1. Define what differs between local, staging, and production.
2. Keep secrets, domains, robots policy, and cache settings environment-specific.
3. Maintain content and schema promotion rules intentionally.
4. Avoid one-off manual changes that cannot be reproduced.
5. Validate preview, redirects, and analytics settings per environment.

Rules:
- Staging must be safe to test and safe to expose to search engines.
- Production-only fixes should be exceptional and documented.
- Environment drift is an operational bug.
