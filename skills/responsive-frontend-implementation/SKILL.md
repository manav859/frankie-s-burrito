---
name: responsive-frontend-implementation
description: Use for mobile-first layout behavior, breakpoint decisions, and adaptive UI implementation.
---

# Responsive Frontend Implementation

Use this for layout or styling work in `web/`.

Workflow:
1. Start from the narrow viewport and expand deliberately.
2. Verify spacing, hierarchy, and tap targets before desktop polish.
3. Avoid layout shifts caused by late-loading media or uncontrolled content.
4. Keep typography scales and grid behavior intentional at each breakpoint.
5. Test the awkward middle widths, not only mobile and full desktop.

Rules:
- Responsive behavior is part of the component contract.
- Do not hide structural issues with arbitrary breakpoint-specific overrides.
- Long text, CMS-driven images, and unknown list lengths must be handled gracefully.
