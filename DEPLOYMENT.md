# Deployment

## Recommended topology

- Host `backend/` on a managed WordPress environment with HTTPS and restricted admin access.
- Host `web/dist/` on a static host or CDN-backed frontend platform.
- Keep the CMS on a subdomain such as `cms.example.com`.
- Keep the public site on the primary domain.

## Backend deployment

Required environment variables:
- `WP_ENVIRONMENT_TYPE`
- `FORCE_SSL_ADMIN`
- `DISALLOW_FILE_MODS`
- `WP_HOME`
- `WP_SITEURL`
- all WordPress salts from [backend/.env.example](/D:/work/frankie's%20burrito/backend/.env.example)

Post-deploy checks:
- confirm `frankies-headless-loader.php` is present in `mu-plugins`
- confirm `/wp-json/frankies/v1/bootstrap` responds
- confirm `Headless Settings` is available in wp-admin
- confirm XML-RPC is disabled

## Frontend deployment

Required environment variables:
- `VITE_WORDPRESS_BASE_URL`
- optionally `WORDPRESS_BASE_URL` for build-time sync jobs that run outside Vite

Build command:
```bash
npm run build
```

Publish directory:
```bash
web/dist
```

Release steps:
1. Update content in WordPress.
2. Confirm `seo.siteUrl` matches the target environment.
3. Confirm the real WordPress `Blog` page is assigned as the posts page.
4. Confirm `VITE_WORDPRESS_BASE_URL` points to the WordPress host that serves `/wp-json/frankies/v1/blog`.
5. Trigger the frontend rebuild via the revalidate webhook or deployment pipeline.
6. Run the frontend build with production env vars.
7. Publish `web/dist`.
8. Purge or refresh CDN cache if your host does not do this atomically.
9. Run the checks in [QA_CHECKLIST.md](/D:/work/frankie's%20burrito/QA_CHECKLIST.md).

## Revalidation workflow

The WordPress plugin can POST to a frontend webhook URL after content changes.

Configure in `Headless Settings`:
- `Frontend revalidate webhook URL`
- `Revalidate secret`

Recommended deployment behavior:
- the webhook should trigger a new frontend build
- the frontend build should call `npm run sync:wordpress`
- the host should atomically publish the new static build

## CDN and cache guidance

- Cache static JS/CSS/font assets with long immutable TTLs.
- Cache public `/wp-json/frankies/v1/*` responses according to the emitted cache headers.
- Do not cache preview responses.
- Put WordPress media behind an image CDN or optimizer where available.

## Rollback

- Frontend: redeploy the previous static artifact.
- WordPress: roll back the plugin/theme code and restore the prior database backup if content/schema changes caused the issue.
- Re-run the frontend build after rollback so the generated SEO assets and route HTML match the restored CMS state.

## Staging vs production

Staging:
- set `WP_ENVIRONMENT_TYPE=staging`
- set the frontend canonical URL to the staging origin only if staging must be indexed, otherwise leave `seo.noindex` enabled in WordPress
- point webhook targets at staging frontend deployments

Production:
- set `WP_ENVIRONMENT_TYPE=production`
- enforce HTTPS everywhere
- keep `seo.noindex` disabled
- point webhook targets at production deployment automation
