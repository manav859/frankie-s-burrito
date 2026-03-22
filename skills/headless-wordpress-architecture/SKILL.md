---
name: headless-wordpress-architecture
description: Use for backend/frontend boundary decisions, delivery architecture, and data ownership in this WordPress + frontend stack.
---

# Headless WordPress Architecture

Use this when defining how WordPress in `backend/` serves content to the frontend in `web/`.

Workflow:
1. Identify content ownership, preview needs, caching rules, and SEO constraints.
2. Keep WordPress responsible for editorial data and admin workflows.
3. Keep frontend responsible for presentation, routing strategy, and runtime performance.
4. Put custom WordPress behavior in `backend/wp-content/`; do not patch core.
5. Prefer a typed API layer in the frontend rather than scattering raw fetch calls.

Rules:
- Decide early whether the frontend is static, SSR, ISR, or client-rendered.
- Model URLs and slugs intentionally so future redirects and previews stay tractable.
- Make preview, cache invalidation, and canonical URL behavior part of the architecture, not post-launch fixes.
