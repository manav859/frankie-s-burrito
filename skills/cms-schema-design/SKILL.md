---
name: cms-schema-design
description: Use for content modeling, field hierarchy, authoring ergonomics, and schema decisions for the CMS.
---

# Content Modeling And CMS Schema Design

Use this before introducing new CMS fields or API contracts.

Workflow:
1. Capture editorial tasks and publishing workflows first.
2. Model repeatable content as arrays or child entities only when editors truly need repetition.
3. Keep field names semantic and durable.
4. Separate display-only concerns from reusable content.
5. Design the schema together with the frontend rendering needs.

Rules:
- Editors should understand what to fill in without reading code.
- Avoid deeply nested field structures that are painful to validate and preview.
- Every field should have a reason to exist and a clear renderer on the frontend.
