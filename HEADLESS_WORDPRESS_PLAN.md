# Headless WordPress Audit And Integration Plan

## Audit Summary

This frontend is a single-page React/Vite marketing site, not a multi-route application.
The current site already follows a headless pattern:

- React renders one public landing page from a `SiteBootstrap` payload.
- WordPress stores singleton homepage settings plus structured menu and testimonial content.
- Build-time sync writes `web/src/generated/site-bootstrap.json` and pre-renders SEO-critical HTML, `robots.txt`, and `sitemap.xml`.

The main gaps were operational rather than architectural:

- REST delivery depended on pretty permalinks.
- The content model was implemented in code but not documented as a full CMS plan.
- There is no article/blog surface yet, so blog modeling should be proposed as an extension rather than forced into the current build.

## Frontend Audit

### Routes and Pages

- Public React routes/pages: one page only, mounted from [web/src/App.tsx](/D:/work/frankie's%20burrito/web/src/App.tsx)
- Public URL structure today: homepage only
- SEO-rendered root document: [web/scripts/static-site.mjs](/D:/work/frankie's%20burrito/web/scripts/static-site.mjs)

### Reusable Sections and Components

Homepage sections in [web/src/App.tsx](/D:/work/frankie's%20burrito/web/src/App.tsx):

- `DesktopHero`
- `MobileHero`
- `MobileMenu`
- `FeaturedSection`
- `ReasonsSection`
- `MenuSection`
- `AboutSection`
- `ProofSection`
- `LocationSection`
- `FinalCtaSection`
- `Footer`
- `MobileStickyCta`

Reusable UI patterns:

- `Button`
- `Reveal`
- `FeaturedCard`
- `InfoCardView`
- `AccordionItem`
- `DesktopMenuPanel`

### Dynamic Content Areas

Current dynamic payload sections from [web/src/types.ts](/D:/work/frankie's%20burrito/web/src/types.ts):

- site announcement, name, tagline
- navigation
- hero copy, desktop image, mobile image, CTAs
- featured intro and featured menu cards
- reasons/value-prop cards
- menu section intro, tabs, grouped menu items, footer CTA
- about copy, image, facts
- proof/testimonial cards
- location copy, map, order/call/catering CTAs
- final CTA
- footer copy
- sitewide SEO payload
- integration payload for analytics and preview

### Blog / News / Article Patterns

- No blog index page
- No article detail page
- No author page
- No article card/list component
- No article route handling in frontend

Conclusion:
- Blog should be modeled as a future-ready extension in WordPress, but it should not be implemented in the frontend yet unless editorial expansion is planned.

### Menus and Navigation

- Navigation is currently a JSON array in site settings
- Links are anchor-based section jumps, not page routes
- Footer navigation repeats the same structure

### Forms

- No lead form, newsletter form, contact form, reservation form, or search form in the React frontend
- Only actionable elements are CTA links to Toast, phone, map, and internal anchors

### SEO-Relevant Pages

- Homepage only
- SEO metadata is injected at runtime and pre-rendered at build time
- `robots.txt` and `sitemap.xml` are generated from the bootstrap payload
- Local business / restaurant schema is generated in WordPress and emitted by React/static build

### Media Usage

- Hero desktop image
- Hero mobile image
- Featured item images
- About image
- Open Graph image
- Decorative SVG illustrations are embedded in React and should remain in code
- Background image in `ProofSection` is hardcoded in React and should be moved to WordPress if editors need control

### Hardcoded Content That Should Live In WordPress

Already moved or represented in current payload:

- homepage copy
- navigation labels
- menu copy and menu items
- testimonial/proof content
- location/hours/order details
- SEO metadata

Still effectively hardcoded in frontend and good candidates for CMS control:

- `ProofSection` background image URL
- some descriptive helper text inside the desktop menu side panel
- some UI-only labels like `Category focus`, `Order this burrito`, `Navigate`, `Visit`, `Order and Social`

These can remain code-owned if editorial control is intentionally limited, but if the site will be maintained by non-developers they should move into settings.

## CMS Content Model Proposal

### Pages

Current:

- `homepage` as a singleton options payload

Future-capable:

- `homepage` singleton
- `legal pages` via native WordPress pages if needed later
- `landing pages` via native pages or a dedicated CPT only if campaign pages are introduced

Recommendation:

- Keep homepage as global options/singleton for now
- Use native `page` post type only when a second public route exists

### Posts / Articles

Current:

- not used in frontend

Future proposal:

- use native `post` for blog/news/articles
- keep native categories and tags
- add article hero image, excerpt, SEO overrides, author, and related posts if blog launches

### Categories and Tags

Current:

- custom taxonomy `menu_category` for menu grouping

Future:

- native `category` and `post_tag` for blog

### Menus

Current:

- homepage nav stored as JSON in options

Recommendation:

- near term: keep option-based nav because it is simple and matches anchor navigation
- future multi-page expansion: move to native `wp_nav_menu` structures exposed over API

### Site Settings

Keep as global settings/options:

- site identity
- announcement bar
- homepage singleton sections
- CTAs
- location and ordering info
- map embed
- footer data
- preview token and revalidate webhook
- analytics id
- canonical site URL
- sitewide social profile URLs
- global OG image

### SEO Fields

Required now:

- title
- meta description
- canonical URL
- keywords
- og image
- noindex
- sameAs
- local business schema fields derived from location data

Recommended extension:

- page-level override model if new pages are added
- default OG fallback + section/image-specific overrides

### Reusable Sections / Components

Model as structured option groups:

- hero
- featured intro
- reasons block
- menu intro/footer CTA
- about block
- proof intro
- location block
- final CTA
- footer

### Custom Post Types and Other Entities

Current CPTs:

- `menu_item`
- `testimonial`

Current taxonomy:

- `menu_category`

Recommended current-state CPT set:

- keep `menu_item`
- keep `testimonial`

Optional future CPTs only if the business needs them:

- `faq`
- `location` if multi-location
- `offer` or `promotion`
- `post` via native posts for editorial

## Backend Approach

### API Choice

Recommendation: custom REST API over WPGraphQL for the current project.

Reasoning:

- the frontend consumes a single shaped bootstrap payload, not arbitrary graph traversal
- custom REST keeps payload size and schema tightly controlled
- preview and revalidation are already implemented with minimal operational complexity
- WPGraphQL would add a second abstraction layer without clear benefit for a single-page marketing site

Use WPGraphQL only if:

- the site becomes multi-template and query-driven
- multiple frontend consumers need flexible field selection
- editorial surfaces expand into posts, archives, related content, and search

### Field Management Choice

Recommendation:

- keep the custom plugin and native post meta/options as the primary implementation
- avoid adding ACF unless the editorial model becomes large enough that custom UI maintenance becomes a burden

Reasoning:

- current schema is small and stable
- plugin-owned schema is easier to version and deploy
- less plugin dependency, less vendor lock-in

### Global Settings Needed

- homepage singleton fields
- SEO defaults
- social profiles
- preview token
- revalidate secret
- frontend revalidate URL
- analytics identifier

### Preview Workflow

Current and recommended:

- WordPress exposes preview endpoint
- frontend enables preview with `?preview=1&token=...`
- request sends `x-frankies-preview-token`
- preview should be environment-scoped and token-based

### Media Handling Strategy

Near term:

- use WordPress Media Library URLs in payload

Better next step:

- store attachment IDs in options/meta when practical
- resolve to full URLs in the API payload
- generate multiple sizes for featured cards and OG images

### SEO Mapping Strategy

- WordPress owns canonical, title, description, keywords, OG image, sameAs, noindex
- API returns a normalized SEO object
- frontend writes tags during hydration
- build pipeline also writes these values into the static HTML shell
- schema should stay server-shaped rather than frontend-generated from scattered fields

## Plugin / Setup List

Production-grade minimal stack:

- custom plugin `frankies-headless`
- MU loader `frankies-headless-loader.php`
- minimal fallback theme `frankies-headless`
- SQLite integration only for local/dev convenience

Avoid unless requirements expand:

- ACF
- WPGraphQL
- extra SEO plugin duplicating existing metadata ownership

Environment/platform dependencies:

- WordPress 6.x
- PHP 8.2+
- object cache optional
- CDN/image optimization on frontend host if available

## Field Schema Plan

### Singleton Options

- `site.announcement`
- `site.siteName`
- `site.siteTagline`
- `navigation[]`
- `hero.*`
- `featuredIntro.*`
- `reasons.*`
- `menu.eyebrow`
- `menu.title`
- `menu.body`
- `menu.note`
- `menu.footerNote`
- `menu.footerCta.*`
- `about.*`
- `proof.eyebrow`
- `proof.title`
- `proof.body`
- `location.*`
- `finalCta.*`
- `footer.*`
- `seo.*`
- `integration.*`

Recommended additions:

- `proof.backgroundImage`
- `ui.labels.orderItem`
- `ui.labels.categoryFocusTitle`
- `ui.labels.categoryFocusBody`
- `footer.headings.navigate`
- `footer.headings.visit`
- `footer.headings.order`

### `menu_item`

- title
- featured image
- description
- price
- order URL override
- featured toggle
- dark card toggle
- menu order
- `menu_category` terms

### `menu_category`

- name
- display order
- CTA label

### `testimonial`

- title
- body
- source label
- menu order

### Future `post`

- title
- slug
- excerpt
- featured image
- body
- categories
- tags
- seo overrides

## API Contract Plan

Primary public endpoints:

- `GET /wp-json/frankies/v1/bootstrap`
- `GET /wp-json/frankies/v1/preview`
- `POST /wp-json/frankies/v1/revalidate`

Payload contract:

- `content`
- `seo`
- `integration`
- `generatedAt`
- `preview`

Recommended future additions only if needed:

- `GET /wp-json/frankies/v1/health`
- `GET /wp-json/frankies/v1/posts`
- `GET /wp-json/frankies/v1/posts/<slug>`

Operational compatibility:

- support pretty route `/wp-json/...`
- support fallback `/?rest_route=/...`

## Frontend Integration Plan

Current approach is correct:

1. build uses WordPress bootstrap when available
2. build writes generated JSON plus static HTML/robots/sitemap
3. runtime hydrates from generated JSON first
4. runtime refreshes from live WordPress if configured
5. preview mode swaps endpoint and sends preview token

Recommended near-term integration rules:

- keep single `SiteBootstrap` contract
- keep static fallback for reliability
- use API fallback route when rewrites are unavailable
- avoid directly querying raw WordPress post objects from React

## SEO Plan

- maintain one authoritative SEO payload in WordPress
- keep canonical URL environment-specific
- emit LocalBusiness/Restaurant schema from backend
- generate `robots.txt` and `sitemap.xml` during build
- if blog launches, generate article schema and archive metadata separately

## Performance Plan

- keep bootstrap payload compact
- prerender root HTML for crawlability
- cache WordPress bootstrap responses at edge/CDN where possible
- use image sizes appropriate to hero/card/OG contexts
- avoid over-fetching by staying with one shaped bootstrap endpoint

## Security Plan

- disable XML-RPC
- hide public REST user endpoints
- keep preview and revalidate token protected
- disable plugin/theme file editing in WP config
- prefer environment variables for secrets in production
- restrict admin access and use HTTPS in production

## Deployment Plan

1. Deploy WordPress backend with custom plugin and fallback theme.
2. Set production site URL, preview token, revalidate secret, and webhook URL.
3. Populate content in WordPress.
4. Build frontend with `WORDPRESS_BASE_URL` set.
5. Publish generated static frontend.
6. Verify bootstrap, metadata, robots, sitemap, and preview.

## Implementation Sequence

Best sequence with minimal complexity:

1. Keep the existing custom headless plugin as the source of truth.
2. Harden frontend/bootstrap fetching against rewrite differences.
3. Add missing rewrite support in WordPress environment.
4. Document the content architecture and editorial model.
5. Add only small CMS fields that remove meaningful hardcoding.
6. Defer blog architecture until a real editorial route is introduced.
