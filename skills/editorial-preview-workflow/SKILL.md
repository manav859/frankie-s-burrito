---
name: editorial-preview-workflow
description: Use for draft previews, unpublished content access, preview URLs, and editorial confidence before publish.
---

# Editorial Preview And Draft Workflow

Use this when drafts must render in the frontend before publish.

Workflow:
1. Define how preview links are generated and authenticated.
2. Separate preview reads from public reads.
3. Ensure drafts, scheduled content, and revisions resolve predictably.
4. Match frontend routes to the canonical production URL structure.
5. Test expired, missing, and unauthorized preview requests.

Rules:
- Preview should be explicit and secure, not a hidden bypass in the public API.
- Draft mode must not poison shared caches.
- Editors need a reliable path from the WordPress editor to the frontend preview target.
