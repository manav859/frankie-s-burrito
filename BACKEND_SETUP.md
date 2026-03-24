# Backend Setup And Frontend Consumption

## Setup

1. Start WordPress from `backend/`.
2. Ensure the MU loader exists at `backend/wp-content/mu-plugins/frankies-headless-loader.php`.
3. Keep the `Frankies Headless` plugin available under `backend/wp-content/plugins/frankies-headless/`.
4. Set WordPress environment values from `backend/.env.example`.
5. In WordPress admin:
   - assign a `Primary Navigation` menu under Appearance > Menus
   - optionally assign `Footer Navigation`
   - fill `Headless Settings`
   - confirm a real `Blog` page exists and is assigned as the posts page
   - create `Menu Categories`
   - create `Menu Items`
   - create `Testimonials`
   - create native `Blogs` and `Pages` for editorial routes

## Data Flow

1. Editors manage singleton homepage/settings content in `Headless Settings`.
2. Repeatable menu content lives in `Menu Items` and `Menu Categories`.
3. Social proof lives in `Testimonials`.
4. Native WordPress menus drive frontend navigation when assigned.
5. Native blog posts/pages are consumed from the custom REST endpoints for editorial routes.
6. The React frontend consumes the shaped headless endpoints, not raw core REST resources.
7. The frontend build syncs the bootstrap payload into `web/src/generated/site-bootstrap.json`.

## Endpoints

### Current homepage/frontend endpoints

- `GET /wp-json/frankies/v1/bootstrap`
  - Primary homepage payload for the existing React frontend.
- `GET /wp-json/frankies/v1/preview`
  - Same payload including draft/private content when `x-frankies-preview-token` is valid.
- `POST /wp-json/frankies/v1/revalidate`
  - WordPress-triggered webhook for frontend rebuild automation.

### Settings and navigation endpoints

- `GET /wp-json/frankies/v1/settings`
  - Structured global settings, SEO defaults, integration flags.
- `GET /wp-json/frankies/v1/navigation`
  - `primary` and `footer` menu arrays.

### Editorial endpoints

- `GET /wp-json/frankies/v1/blog`
  - Archive/list endpoint with pagination and optional `category`, `tag`, `search`, `page`, `per_page`.
- `GET /wp-json/frankies/v1/blog/<slug>`
  - Single article payload with related posts.
- `GET /wp-json/frankies/v1/pages`
  - Published native page list for route generation and frontend navigation surfaces.
- `GET /wp-json/frankies/v1/pages/<slug>`
  - Single native page payload.

## Frontend Consumption Notes

### Existing React homepage

- Continue consuming `bootstrap`.
- The `navigation` array now prefers native WordPress menus and falls back to settings JSON.
- `menu.categoryFocusTitle`, `menu.categoryFocusBody`, `menu.itemCtaLabel`, and footer headings are now CMS-driven.
- Build-time CMS route generation for `/blog/*` and `/<page-slug>` requires `WORDPRESS_BASE_URL` or `VITE_WORDPRESS_BASE_URL`.
- Runtime frontend CMS fetches for blog routes should use `VITE_WORDPRESS_BASE_URL` pointing at the WordPress origin.
- The frontend build also generates `robots.txt`, `sitemap.xml`, and per-route HTML with SEO metadata and JSON-LD before hydration.

### Blog and page routes

- Use `blog` for archive/list pages.
- Use `blog/<slug>` for article detail pages.
- Use `pages/<slug>` for standalone CMS pages.
- Keep normalization at the fetch layer in `web/src/lib/`.
- Post canonicals are intentionally public-facing `/blog/<slug>/`.
- Page canonicals are intentionally public-facing `/<slug>/`.

## Secrets And Webhooks

- `integration.previewToken`
  - Used by preview reads.
- `integration.revalidateSecret`
  - Used to authenticate frontend rebuild webhooks.
- `integration.frontendRevalidateUrl`
  - Frontend deployment endpoint that WordPress calls on publish/update.

## Performance And Cache Strategy

- Public REST endpoints now emit:
  - `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`
  - `ETag`
- Preview responses emit:
  - `Cache-Control: private, no-store, max-age=0`
- Public headless payloads are cached in WordPress transients and invalidated automatically when:
  - singleton settings change
  - menu items, testimonials, posts, or pages are saved
  - menu categories change
  - navigation menus are updated
- The frontend also keeps short-lived session cache entries for public CMS reads to avoid repeating the same requests within a browsing session.

### Production delivery recommendations

- Put the React frontend behind a CDN and cache built assets aggressively.
- Cache `/wp-json/frankies/v1/*` at the CDN or reverse proxy using the API response headers.
- Keep preview endpoints un-cached.
- Use WordPress publish/update hooks plus the revalidate webhook to rebuild and refresh static artifacts.
- Put `wp-content/uploads` behind an image CDN or edge optimizer that can serve modern formats and resized variants.

### Monitoring recommendations

- Track Core Web Vitals in production with real-user monitoring, not only Lighthouse.
- Watch:
  - LCP on the homepage hero
  - CLS on article and CMS-image surfaces
  - TTFB for `bootstrap` and `blog` endpoints
  - cache hit rate at the CDN layer

## SEO Field Management In WordPress

### Global SEO defaults

Editors manage homepage/global defaults in `Headless Settings`:
- `seo.siteUrl`
  - Public frontend origin used for canonical URLs and sitemap generation.
- `seo.title`
  - Homepage title.
- `seo.description`
  - Homepage description and fallback description for thin content.
- `seo.keywords`
  - Legacy keyword fallback used for the homepage and as a fallback for entry payloads.
- `seo.ogImage`
  - Default social sharing image.
- `seo.sameAs`
  - Social/profile URLs used in Organization and Restaurant schema.
- `seo.noindex`
  - Emergency site-wide noindex switch for non-production environments.

### Per-entry SEO overrides

Native WordPress `Posts` and `Pages` include a custom SEO meta box:
- SEO Title
- Meta Description
- OG Image URL
- Noindex checkbox

If a field is empty:
- title falls back to `<entry title> | <site name>`
- description falls back to excerpt, then global description
- OG image falls back to featured image, then global OG image
- keywords fall back to categories/tags plus global keywords

### Structured data mapping

- Homepage `bootstrap.seo.schema`
  - `Organization`
  - `WebSite`
  - `Restaurant`
- Blog index
  - `BreadcrumbList`
  - `CollectionPage`
- Post detail `posts/<slug>`
  - `BreadcrumbList`
  - `BlogPosting`
- Page detail `pages/<slug>`
  - `BreadcrumbList`
  - `WebPage`

Only schema that matches real content is emitted.

## Redirect And Migration Notes

- If an older site exists, create a redirect map before launch.
- Preserve homepage and section anchors where possible.
- Redirect any legacy article URLs to `/blog/<slug>/`.
- Redirect any legacy standalone pages to `/<slug>/`.
- Do not publish both WordPress frontend URLs and headless frontend URLs as indexable pages.

## SEO Verification Checklist

- Homepage source contains the expected `<title>`, meta description, canonical, OG, Twitter, robots, and JSON-LD.
- `/blog/` source contains a canonical URL, crawlable article links, and `CollectionPage` plus breadcrumb schema.
- Each `/blog/<slug>/` page source contains:
  - the article headline in HTML
  - canonical URL under `/blog/<slug>/`
  - `BlogPosting` schema
  - correct `og:type=article`
- Each `/<slug>/` page source contains:
  - the page heading in HTML
  - canonical URL under `/<slug>/`
  - `WebPage` plus breadcrumb schema
- `robots.txt` points to the frontend sitemap.
- `sitemap.xml` includes only public indexable routes.
- WordPress fallback frontend remains noindex.
- Featured images have meaningful alt text in WordPress.
