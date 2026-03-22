---
name: analytics-integration
description: Use for analytics event design, tag placement, privacy-aware instrumentation, and measurement reliability.
---

# Analytics Integration

Use this when adding or changing measurement.

Workflow:
1. Define business questions before adding events.
2. Name events and properties consistently.
3. Track meaningful user actions, not arbitrary clicks.
4. Respect consent, privacy requirements, and environment separation.
5. Verify events in staging before production rollout.

Rules:
- Analytics should be minimal, intentional, and auditable.
- Do not duplicate measurement across multiple layers without a reason.
- Broken analytics is often caused by unclear ownership; keep instrumentation centralized.
