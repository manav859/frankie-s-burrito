# Final QA Checklist

## CMS

- Headless settings are populated with final approved copy.
- Menu categories are ordered correctly.
- Featured menu items have featured images and prices.
- Testimonials render with source labels.
- Preview token and revalidate secret are set only in the right environment.

## API

- `GET /wp-json/frankies/v1/bootstrap` returns content, seo, and integration keys.
- `GET /wp-json/frankies/v1/preview` rejects requests without the preview header.
- `POST /wp-json/frankies/v1/revalidate` rejects requests without the secret header.
- public `/wp/v2/users` endpoints are unavailable to anonymous users.

## Frontend

- `npm run build` completes successfully.
- generated `web/index.html` contains title, description, canonical, Open Graph, and JSON-LD tags.
- generated `web/public/robots.txt` and `web/public/sitemap.xml` match the intended environment.
- homepage route `/` renders from CMS data.
- blog archive `/blog/` renders CMS posts.
- blog detail `/blog/<slug>/` renders the expected article.
- native page route `/<slug>/` renders the expected WordPress page.
- missing CMS entry routes show a controlled empty/error state.
- desktop and mobile hero sections render from CMS data.
- menu categories and featured items render from WordPress data.
- location CTAs, Toast links, phone link, and map embed work.
- footer navigation and primary navigation match WordPress menus.
- images render without obvious layout jumps or broken placeholders.

## SEO

- canonical URL is correct for the production origin.
- `seo.noindex` is enabled on staging and disabled on production.
- JSON-LD validates as restaurant schema.
- visible headings and metadata align with final page intent.
- blog archive and post detail pages have route-specific metadata.
- `robots.txt` references the intended production sitemap.
- sitemap contains homepage, article, and native page routes only when indexable.

## Performance and accessibility

- homepage passes a manual mobile and desktop smoke test.
- interactive controls are keyboard reachable.
- map iframe has a descriptive title.
- reduced motion mode remains usable.
- large media URLs are optimized or replaced with production assets.

## Handoff

- deployment environment variables are documented.
- webhook target and secret are stored outside the repo.
- WordPress admin users know which content lives in Headless Settings versus custom post types.
- commit and release notes are prepared from the recommended commit plan in the handoff.
