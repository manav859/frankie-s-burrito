---
name: performance-core-web-vitals
description: Use for frontend loading behavior, rendering performance, network efficiency, and Core Web Vitals improvements.
---

# Performance Optimization / Core Web Vitals

Use this when page speed or rendering stability is part of the task.

Workflow:
1. Identify the biggest runtime costs first: JS, images, fonts, layout shifts, or network waterfalls.
2. Trim payload size before adding clever optimizations.
3. Defer or split non-critical code.
4. Reserve media dimensions and stabilize layout.
5. Re-measure after each meaningful change.

Rules:
- Optimize the critical path, not synthetic micro-benchmarks.
- CMS-driven pages must handle large content safely by default.
- Prefer fewer requests, smaller assets, and predictable rendering over runtime complexity.
