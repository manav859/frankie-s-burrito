---
name: ci-cd-deployment
description: Use for build pipelines, deployment automation, promotion gates, and release repeatability.
---

# CI/CD And Deployment

Use this when defining or improving delivery pipelines.

Workflow:
1. Identify build outputs for backend and frontend separately.
2. Make lint, typecheck, tests, and production builds explicit pipeline steps.
3. Keep environment variables injected by platform, not hardcoded.
4. Prefer repeatable deploy artifacts over mutable server state.
5. Define rollback and failure visibility before rollout.

Rules:
- Deployment should be reproducible from committed code and configuration.
- Frontend and WordPress may deploy on different cadences; design for that explicitly.
- A pipeline without verification is only an automated copy step.
