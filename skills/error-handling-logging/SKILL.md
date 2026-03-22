---
name: error-handling-logging
description: Use for runtime error handling, observability, logging discipline, and production diagnostics.
---

# Error Handling And Logging

Use this when adding network calls, async workflows, or operational visibility.

Workflow:
1. Distinguish user-facing fallback behavior from operator-facing diagnostics.
2. Log enough context to debug without leaking secrets or personal data.
3. Normalize expected failure modes close to the integration boundary.
4. Keep production logs structured and searchable where possible.
5. Ensure errors surface to the right place: UI, server logs, monitoring, or all three.

Rules:
- Silent failure is only acceptable when the fallback is deliberate and harmless.
- Logging volume should be proportional to actionability.
- Error states should be testable, not incidental.
