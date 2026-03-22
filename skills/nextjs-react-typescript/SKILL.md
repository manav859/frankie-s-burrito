---
name: nextjs-react-typescript
description: Use for React + TypeScript implementation, and for migrations from the current Vite frontend toward Next.js when needed.
---

# Next.js + React + TypeScript Development

Use this for frontend feature work and for any future move from Vite to Next.js.

Workflow:
1. Inspect `web/src/` before changing patterns.
2. Keep components typed from the data edge inward.
3. Separate content fetching, transformation, and presentation.
4. Reuse primitives before creating new abstractions.
5. If migrating to Next.js, define routing, data fetching, and preview strategy first.

Rules:
- Prefer explicit props and simple composition over deep configuration objects.
- Keep server and client responsibilities clear if Next.js is introduced.
- Avoid framework-specific rewrites unless the task explicitly justifies them.
