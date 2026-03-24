# Frankie's Burrito Headless Stack

This repository now ships a production-oriented split architecture:

- `backend/` is the WordPress CMS
- `backend/wp-content/plugins/frankies-headless/` owns the headless content model, REST contract, preview hook, SEO payload, and backend hardening
- `backend/wp-content/mu-plugins/frankies-headless-loader.php` auto-loads that plugin in every environment
- `backend/wp-content/themes/frankies-headless/` is the minimal fallback theme for the CMS host
- `web/` is the React frontend
- `web/src/generated/site-bootstrap.json` is the generated build-time bootstrap payload used for reliable builds and static SEO asset generation

## Backend model

The WordPress backend is intentionally plugin-light.

Core content structures:
- `menu_item` custom post type
- `menu_category` custom taxonomy
- `testimonial` custom post type
- native WordPress `post` powers the `Blogs` admin section and the `/blog` archive
- native WordPress `page` remains available for standalone editorial routes
- `Headless Settings` admin screen for singleton homepage sections, SEO metadata, preview token, and deployment hooks

Public API:
- `GET /wp-json/frankies/v1/bootstrap`
- `GET /wp-json/frankies/v1/settings`
- `GET /wp-json/frankies/v1/navigation`
- `GET /wp-json/frankies/v1/preview` with header `x-frankies-preview-token`
- `POST /wp-json/frankies/v1/revalidate` with header `x-frankies-revalidate-secret`
- `GET /wp-json/frankies/v1/blog`
- `GET /wp-json/frankies/v1/blog/<slug>`
- `GET /wp-json/frankies/v1/pages`
- `GET /wp-json/frankies/v1/pages/<slug>`

Hardening included:
- XML-RPC disabled
- public user REST endpoints removed
- WordPress file editing disabled in config
- env-driven salts and debug settings
- comments disabled for the headless content model
- fallback CMS frontend marked noindex

SEO included:
- homepage, post, and page SEO fields exposed through the custom REST contract
- dynamic titles, descriptions, canonicals, OG, Twitter, and robots directives
- structured data for `Organization`, `WebSite`, `Restaurant`, `CollectionPage`, `BreadcrumbList`, `BlogPosting`, and `WebPage` where applicable
- generated `robots.txt` and `sitemap.xml` from the frontend build
- `/blog/<slug>/` canonical alignment for articles so headless URLs stay consistent

Performance included:
- public headless endpoints now return `Cache-Control` and `ETag` headers
- WordPress public REST payloads are transient-cached with versioned invalidation on content changes
- frontend CMS fetches use session-backed caching to reduce duplicate requests
- static route HTML now includes font preconnects and below-the-fold sections use `content-visibility`
- CMS media surfaces use lazy image loading instead of decorative background images where practical

## Frontend flow

The frontend build is now CMS-aware without depending on live runtime fetches in production.

Build pipeline:
1. `npm run sync:wordpress`
2. fetch the bootstrap payload from WordPress when `WORDPRESS_BASE_URL` or `VITE_WORDPRESS_BASE_URL` is set
3. fetch blog posts and native pages for route generation when a WordPress base URL is set
4. write `web/src/generated/site-bootstrap.json`
5. regenerate `web/index.html`, route HTML files, `web/public/robots.txt`, and `web/public/sitemap.xml`
6. run `vite build`

At runtime:
- the app hydrates from generated bootstrap data first
- if a WordPress base URL is configured, it refreshes from the live CMS
- production frontend fetches should use `VITE_WORDPRESS_BASE_URL` pointing at the WordPress host; do not rely on the browser origin for blog API requests
- if `?preview=1&token=...` is present, it calls the preview endpoint

## Local setup

Local infrastructure:
1. Copy [/.env.example](/D:/work/frankie's%20burrito/.env.example) to `.env` if you use the included Docker stack.
2. Adjust MySQL, WordPress, and phpMyAdmin ports only if they conflict locally.

Backend:
1. Configure WordPress environment variables from [backend/.env.example](/D:/work/frankie's%20burrito/backend/.env.example).
2. Assign `Primary Navigation` under Appearance > Menus if you want native menu-driven nav.
3. Confirm a real WordPress page named `Blog` exists and is assigned as the posts page.
4. Use the CMS admin to create `menu_category`, `menu_item`, `testimonial`, and `blog` entries.
5. Fill singleton sections in `Headless Settings`.
6. Switch to the `Frankies Headless` theme if your environment needs a minimal active theme.
7. For SEO:
   - fill homepage defaults in `Headless Settings`
   - use the SEO meta box on native posts/pages for entry-specific overrides
   - keep featured images and image alt text populated for posts/pages/menu items

Frontend:
1. Copy `web/.env.example` to `web/.env`.
2. Set `VITE_WORDPRESS_BASE_URL` to the CMS origin, for example `https://cms.example.com`.
3. Run `npm install` only if dependencies are missing.
4. Run `npm run build` in `web/`.

## Deployment

Frontend:
1. Set `VITE_WORDPRESS_BASE_URL` to the production CMS origin.
2. Optionally set `WORDPRESS_BASE_URL` for build-time sync jobs outside Vite.
3. Run `npm run build` inside `web/`.
4. Publish `web/dist/` to the frontend host.

WordPress:
1. Set values from [backend/.env.example](/D:/work/frankie's%20burrito/backend/.env.example), especially salts, `FORCE_SSL_ADMIN`, `DISALLOW_FILE_MODS`, `WP_HOME`, and `WP_SITEURL`.
2. Deploy the custom plugin, MU loader, and minimal theme with the WordPress install.
3. Confirm `Headless Settings`, menus, and custom content are present.
4. Set the frontend revalidate webhook URL and secret in WordPress.

## Troubleshooting

- If `/wp-json/frankies/v1/bootstrap` fails, check WordPress permalinks and [backend/.htaccess](/D:/work/frankie's%20burrito/backend/.htaccess).
- If blog data fails to load, confirm `VITE_WORDPRESS_BASE_URL` points to the WordPress host and that `/wp-json/frankies/v1/blog` responds there.
- If the frontend shows stale CMS content, check the revalidate webhook target and CDN cache behavior.
- If preview content does not load, confirm `x-frankies-preview-token` matches the WordPress setting and that preview URLs include `?preview=1&token=...`.
- If canonical or sitemap URLs are wrong, update `seo.siteUrl` in `Headless Settings` and rebuild the frontend.

## Editor handoff

- WordPress admins should start with [ADMIN_TASKS.md](/D:/work/frankie's%20burrito/web/ADMIN_TASKS.md).
- Backend architecture, API, SEO, and caching details live in [BACKEND_SETUP.md](/D:/work/frankie's%20burrito/BACKEND_SETUP.md).
- Deployment and release expectations live in [DEPLOYMENT.md](/D:/work/frankie's%20burrito/DEPLOYMENT.md).
- Final release checks live in [QA_CHECKLIST.md](/D:/work/frankie's%20burrito/QA_CHECKLIST.md).

## Notes

- The frontend remains React/Vite for maintainability because the current site is a single marketing surface; the production SEO gap is handled with generated static metadata, sitemap, robots, and pre-rendered semantic HTML during build.
- If the site expands into multi-route editorial content, the next maintainable step is a dedicated SSR framework migration rather than pushing more complexity into the current SPA.
- Recommended production delivery:
  - serve the frontend from a CDN with immutable asset caching for hashed JS/CSS bundles
  - cache public `/wp-json/frankies/v1/*` responses at the edge for at least the emitted `s-maxage`
  - place WordPress uploads behind an image CDN or optimizer
  - trigger `POST /wp-json/frankies/v1/revalidate` on publish/update so static artifacts stay warm and fresh
