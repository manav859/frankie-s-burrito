---
name: caching-revalidation
description: Use for cache strategy, invalidation design, CDN behavior, API freshness, and content revalidation logic.
---

# Caching And Revalidation

Use this when balancing freshness and performance.

Workflow:
1. Identify which data can be cached, where, and for how long.
2. Separate public content caching from authenticated preview or draft reads.
3. Use explicit invalidation triggers when content changes.
4. Define stale behavior and failure fallback paths.
5. Document cache layers so debugging does not turn into guesswork.

Rules:
- Cache keys must reflect the data contract and visibility scope.
- Preview and draft content must bypass or isolate shared caches.
- Every cache needs an invalidation story, not only a TTL.
