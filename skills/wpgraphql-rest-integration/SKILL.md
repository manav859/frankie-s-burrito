---
name: wpgraphql-rest-integration
description: Use for WordPress API design, WPGraphQL or REST integration, typed frontend consumers, and content fetch strategy.
---

# WPGraphQL / REST API Integration

Use this for API contracts between `backend/` and `web/`.

Workflow:
1. Inspect the current source of truth for content and available endpoints.
2. Choose REST for simple built-in resources and WPGraphQL when query flexibility materially helps.
3. Centralize fetch logic in a small client layer under `web/src/`.
4. Validate error handling, empty states, and fallback behavior.
5. Type the returned data and normalize it close to the API boundary.

Rules:
- Do not spread endpoint URLs and response assumptions across components.
- Prefer stable, minimal payloads over fetching entire page objects blindly.
- Support draft/preview access separately from public production reads.
