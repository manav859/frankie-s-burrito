---
name: technical-seo
description: Use for crawlability, indexation, metadata consistency, canonicalization, and technical SEO implementation.
---

# Technical SEO Implementation

Use this for SEO-sensitive backend or frontend work.

Workflow:
1. Define canonical URLs, indexation rules, and environment behavior.
2. Ensure metadata is generated from stable content sources.
3. Validate robots, sitemap, status codes, and redirects together.
4. Check rendered heading structure and internal linking.
5. Verify that performance and media strategy support search visibility.

Rules:
- Do not ship duplicated metadata or conflicting canonicals.
- Staging environments must be explicitly non-indexable.
- SEO logic belongs in code paths that are easy to audit and test.
