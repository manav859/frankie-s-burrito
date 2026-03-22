# Frankies CMS Admin Guide

The old ACF page-by-page setup has been replaced with a custom headless plugin in WordPress.

## Where content lives

Use these WordPress areas:
- `Headless Settings` for singleton homepage content, SEO, preview token, and deployment hooks
- `Appearance > Menus` for native `Primary Navigation` and optional `Footer Navigation`
- `Menu Categories` for menu section groupings and display order
- `Menu Items` for actual burritos, sides, drinks, featured cards, and item pricing
- `Testimonials` for social proof cards
- native `Posts` and `Pages` for future editorial content

## What editors should update

In `Headless Settings`:
- site name, tagline, announcement
- hero copy and hero images
- reasons, about, location, and final CTA copy
- footer copy
- canonical URL, SEO title, description, Open Graph image, and `sameAs` links

In `Menu Categories`:
- section names
- display order
- CTA labels

In `Menu Items`:
- title
- description
- price
- featured image
- featured image alt text
- featured toggle
- featured dark card toggle
- assigned menu category

In `Testimonials`:
- headline
- body
- source label

## Build and launch flow

1. Publish or update CMS content in WordPress.
2. Verify `/wp-json/frankies/v1/bootstrap` returns the new content.
3. Trigger the frontend deployment webhook or let WordPress send it automatically if configured.
4. Run `npm run build` for the frontend deployment.
5. Verify the generated `robots.txt`, `sitemap.xml`, and HTML metadata before launch.

## Preview

- Preview requests use `GET /wp-json/frankies/v1/preview`
- Send the `x-frankies-preview-token` header
- Frontend preview mode can be tested with `?preview=1&token=...`

## Posts and pages

- Native `Posts` render at `/blog/<slug>/`
- Native `Pages` render at `/<slug>/`
- Use the SEO meta box on posts/pages for title, description, OG image, and noindex overrides
- Keep featured images and image alt text populated so social cards and article/page rendering stay complete

## Launch checks

- final production media is used instead of stock placeholders
- all Toast and phone links are correct
- canonical URL matches the live domain
- `seo.noindex` is disabled in production
- location details and hours match the storefront
