---
name: schema-markup
description: Use for JSON-LD, structured data generation, validation, and entity mapping from CMS content.
---

# Schema Markup / Structured Data

Use this when implementing or reviewing structured data.

Workflow:
1. Identify the real entity represented by the page.
2. Generate JSON-LD from trusted content fields, not duplicated hardcoded values.
3. Keep required and recommended properties explicit.
4. Validate against rendered URLs, image assets, and canonical metadata.
5. Reuse helpers so schema logic stays consistent across templates.

Rules:
- Only output schema that is actually supported by the page content.
- Do not emit contradictory or placeholder data.
- Structured data should degrade cleanly if optional CMS fields are absent.
