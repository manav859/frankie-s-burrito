# Local Skills

This repository now includes a local `skills/` pack for the WordPress + frontend workflow used here.

Project context:
- WordPress backend lives in `backend/`
- Custom WordPress work should go in `backend/wp-content/`, not in core files
- Frontend app lives in `web/`
- Current frontend is Vite + React + TypeScript, even where a skill also references a future Next.js migration path

Installed skills:
- `headless-wordpress-architecture`
- `wordpress-installation-hardening`
- `wordpress-cpts-taxonomies-fields`
- `wpgraphql-rest-integration`
- `nextjs-react-typescript`
- `reusable-component-architecture`
- `responsive-frontend-implementation`
- `cms-schema-design`
- `editorial-preview-workflow`
- `technical-seo`
- `on-page-seo-structure`
- `schema-markup`
- `sitemap-robots`
- `performance-core-web-vitals`
- `image-media-optimization`
- `accessibility-best-practices`
- `security-hardening`
- `git-workflow-repo-hygiene`
- `ci-cd-deployment`
- `staging-production-management`
- `caching-revalidation`
- `testing-qa`
- `analytics-integration`
- `error-handling-logging`
- `documentation-writing`
- `prompt-improver`
- `requirements-clarifier`
- `debugging-skill`
- `refactoring-skill`
- `migration-redirects`

Usage notes:
- Invoke a skill by name when the task clearly matches it.
- Skills are intentionally short and operational. They are meant to shape implementation decisions, not replace code inspection.
- For WordPress changes, prefer custom plugins, mu-plugins, or theme-level code under `backend/wp-content/`.
- For frontend changes, inspect `web/src/` first and preserve existing patterns unless the task is explicitly a refactor or migration.
