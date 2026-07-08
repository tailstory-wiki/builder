# builder

Build tool for rendering Markdown to HTML partials.

## Layouts

- `partial.njk` — standard doc page: title header, last-updated + GitHub edit link, body.
- `landing.njk` — hub/landing page: same as `partial.njk`, plus a card grid generated
  from the directory's `toc.yaml`. Card descriptions come from each target page's
  `description` frontmatter; the entry pointing at the landing page itself is skipped.
  Card hrefs are prefixed with `/$WIKI_VENDOR/$WIKI_PRODUCT` (workflow inputs).

## Artifacts

Besides the per-page `index.html` partials, the build emits:

- `toc.json` per directory containing a `toc.yaml` (`npm run build:tocs`, validated
  against `toc-schema.json`).
- `links.json` at the product root when the content repo has a `docs/links.yaml`
  (`npm run build:links`, validated against `links-schema.json`) — external links
  shown in the wiki's product subnav. Optional; absent file skips the step.
