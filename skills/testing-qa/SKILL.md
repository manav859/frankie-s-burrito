---
name: testing-qa
description: Use for validation strategy, regression coverage, manual QA checklists, and release confidence.
---

# Testing And QA

Use this when implementing or reviewing changes that need verification.

Workflow:
1. Define what can break: data shape, rendering, accessibility, SEO, or admin workflow.
2. Add the cheapest reliable automated checks first.
3. Supplement with manual QA for content, responsive behavior, and cross-surface workflows.
4. Verify failure cases, not only the happy path.
5. Record any testing gaps explicitly.

Rules:
- A change without verification is incomplete.
- QA should cover both the WordPress authoring path and the frontend consumption path when relevant.
- Test names and checklists should describe behavior, not implementation trivia.
