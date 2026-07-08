# builder

Build tool for rendering Markdown to HTML partials.

## Layouts

- `partial.njk` — standard doc page: title header, last-updated + GitHub edit link, body.
- `landing.njk` — hub/landing page: same as `partial.njk`, plus card groups generated
  from the directory's `toc.yaml`. A `{section, pages}` entry becomes a headed group;
  consecutive plain leaves collect into a heading-less group. Card descriptions come
  from each target page's `description` frontmatter; the entry pointing at the landing
  page itself is skipped. Card hrefs are prefixed with `/$WIKI_VENDOR/$WIKI_PRODUCT`
  (workflow inputs).

## Frontmatter

Besides Eleventy's `layout` and the `title`/`description` keys, pages may set
`tsy.topic`. Both layouts stamp the value onto the partial's root element as
`data-tsy-topic`, and the worker styles pages by it:

- `hub-page` — the worker hides the TOC rail (product homes).
- `landing-page` — the TOC rail stays visible (section homes).

`tsy.topic` only takes effect on pages that also set a `layout` — without a layout
no `<article>` wrapper is emitted, so the attribute has nowhere to live.

## Artifacts

Besides the per-page `index.html` partials, the build emits:

- `toc.json` per directory containing a `toc.yaml` (`npm run build:tocs`, validated
  against `toc-schema.json`). The root `toc.yaml` may also declare a top-level
  `tabs` list (same `{title, page}` shape as leaf entries): the worker renders
  exactly those tabs, in order, in the product subnav. Omit the key to render no
  tabs — there is no fallback to the entry list. A `tabs` key in a nested
  directory's `toc.yaml` validates but is ignored.
- `links.json` at the product root when the content repo has a `docs/links.yaml`
  (`npm run build:links`, validated against `links-schema.json`) — external links
  shown in the wiki's product subnav. Optional; absent file skips the step.
