---
name: reusable-component-architecture
description: Use for component boundaries, shared UI primitives, section composition, and avoiding duplication in the frontend.
---

# Reusable Component Architecture

Use this when multiple pages or sections are starting to duplicate structure.

Workflow:
1. Identify repeated layout, behavior, and visual patterns.
2. Extract stable primitives first, then composed section components.
3. Keep data mapping outside presentational components.
4. Expose the smallest prop surface that remains ergonomic.
5. Prefer composition over option-heavy mega-components.

Rules:
- Do not generalize one-off code prematurely.
- Shared components should encode a real pattern, not just reduce line count.
- Reusability includes accessibility, state behavior, and responsive behavior, not only markup.
