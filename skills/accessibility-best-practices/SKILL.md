---
name: accessibility-best-practices
description: Use for semantic HTML, keyboard support, focus management, color contrast, and assistive technology compatibility.
---

# Accessibility Best Practices

Use this for any user-facing frontend change.

Workflow:
1. Prefer semantic elements before ARIA.
2. Check keyboard navigation, focus order, and visible focus states.
3. Ensure labels, roles, names, and status messages are exposed properly.
4. Verify contrast, motion sensitivity, and zoom resilience.
5. Test dynamic states such as modals, menus, and async updates.

Rules:
- Accessibility is a default quality bar, not a later enhancement.
- Every interactive control needs a clear accessible name.
- Layout and animation decisions must not block core tasks for keyboard or screen-reader users.
