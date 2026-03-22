---
name: security-hardening
description: Use for application hardening across WordPress, APIs, frontend exposure, auth surfaces, and deployment configuration.
---

# Security Hardening

Use this when a task affects secrets, auth, input handling, or public attack surface.

Workflow:
1. Identify trust boundaries and exposed entry points.
2. Validate and sanitize untrusted input at the correct layer.
3. Reduce privileges, routes, and plugins to the minimum needed.
4. Protect secrets, tokens, and admin endpoints by environment.
5. Review logs and error output for accidental leakage.

Rules:
- Security work belongs in code and configuration, not only documentation.
- Public APIs should expose the smallest viable surface.
- If a change widens exposure, state the tradeoff explicitly.
