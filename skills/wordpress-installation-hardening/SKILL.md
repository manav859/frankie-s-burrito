---
name: wordpress-installation-hardening
description: Use for WordPress bootstrap, local setup, plugin hygiene, config safety, and baseline hardening.
---

# WordPress Installation And Hardening

Use this when configuring or reviewing the WordPress app in `backend/`.

Checklist:
1. Keep secrets and environment-specific values out of committed config where possible.
2. Disable or remove unused plugins, themes, and attack surface.
3. Verify file permissions, debug flags, and environment-specific constants.
4. Prefer mu-plugins or custom plugins for persistent project logic.
5. Confirm backup, restore, and database migration path before major changes.

Hardening focus:
- Disable features you do not need, especially XML-RPC or file editing if unused.
- Protect admin access, login flows, and database credentials.
- Treat `wp-config.php` and any writable upload/database paths as high-risk areas.
