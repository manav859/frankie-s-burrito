---
name: sitemap-robots
description: Use for sitemap generation, robots rules, environment-aware crawl directives, and search engine discovery endpoints.
---

# Sitemap And Robots Generation

Use this for crawl directive work.

Workflow:
1. Decide which content types are indexable.
2. Generate sitemap entries from canonical URLs only.
3. Exclude drafts, previews, and non-public resources.
4. Keep `robots.txt` environment-aware, especially for staging.
5. Revalidate sitemap output when content changes materially.

Rules:
- Sitemaps should reflect the actual public URL space.
- Never allow staging to leak into search indexing.
- Robots rules must align with canonical tags and redirect behavior.
