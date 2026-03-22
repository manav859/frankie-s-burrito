---
name: wordpress-cpts-taxonomies-fields
description: Use for custom post types, taxonomies, ACF/meta fields, and editorial data shape inside WordPress.
---

# Custom Post Types, Taxonomies, And Fields

Use this when defining or changing editorial entities in WordPress.

Workflow:
1. Start with the content model, not the UI.
2. Choose post types for primary entities and taxonomies for reusable classification.
3. Use custom fields only for attributes that are not first-class content objects.
4. Keep field names stable and API-friendly.
5. Register content structures in code where possible for reproducibility.

Rules:
- Avoid overloading regular pages with large nested meta blobs if the data deserves its own entity.
- Plan archive behavior, slugs, labels, and REST/GraphQL exposure at the same time.
- Keep field shapes friendly to TypeScript consumers in the frontend.
