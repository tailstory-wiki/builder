import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import { parse as parseYaml } from "yaml";

const inputDir = process.env.WIKI_INPUT_DIR || "docs";
const docsRepo = process.env.WIKI_DOCS_REPO || "";
const docsRef = process.env.WIKI_DOCS_REF || "main";
const docsPath = process.env.WIKI_DOCS_PATH || "docs";
const vendor = process.env.WIKI_VENDOR || "";
const product = process.env.WIKI_PRODUCT || "";

function relativeFromInput(inputPath) {
    return path.relative(path.resolve(inputDir), path.resolve(inputPath));
}

export default function (eleventyConfig) {
    eleventyConfig.setLibrary("md", markdownIt({
        html: true,
        linkify: true,
        typographer: false,
    }));

    eleventyConfig.addFilter("editUrl", (inputPath) => {
        if (!docsRepo || !inputPath) return "";
        const rel = relativeFromInput(inputPath);
        const repoPath = docsPath ? `${docsPath}/${rel}` : rel;
        return `https://github.com/${docsRepo}/blob/${docsRef}/${repoPath}`;
    });

    // The worker's in-wiki URL for a page's raw Markdown source, mirroring the
    // pretty-permalink scheme used for the rendered page: index.md maps to the
    // directory root, every other foo.md to foo, with ".md" appended.
    eleventyConfig.addFilter("markdownUrl", (inputPath) => {
        if (!vendor || !product || !inputPath) return "";
        let slug = relativeFromInput(inputPath).replace(/\.md$/, "");
        if (slug === "index") slug = "";
        else if (slug.endsWith("/index")) slug = slug.slice(0, -"/index".length);
        const segments = [vendor, product, slug].filter(Boolean);
        return `/${segments.join("/")}.md`;
    });

    eleventyConfig.addFilter("lastUpdated", (inputPath) => {
        if (!inputPath) return "";
        try {
            const out = execFileSync(
                "git",
                ["log", "-1", "--format=%cI", "--", path.resolve(inputPath)],
                { cwd: path.resolve(inputDir), encoding: "utf8" },
            ).trim();
            return out;
        } catch {
            return "";
        }
    });

    // "tsy.topic" is a literal dotted frontmatter key; Nunjucks cannot
    // reference a dotted variable name, so expose the value to layouts as
    // `pageTopic`. The outer function is required: addGlobalData invokes
    // function values once at config time, and only the returned callback
    // becomes the per-page computed value.
    eleventyConfig.addGlobalData("eleventyComputed.pageTopic", () => {
        return (data) => data["tsy.topic"] ?? "";
    });

    // Card groups for landing.njk: the current directory's toc.yaml entries,
    // minus the entry for the landing page itself, each enriched with the
    // target page's `description` frontmatter and a site-absolute href.
    // {section, pages} entries become headed groups; consecutive plain leaves
    // collect into heading-less groups, preserving authored order.
    eleventyConfig.addFilter("landingCardGroups", (inputPath) => {
        if (!inputPath) return [];
        const directory = path.dirname(path.resolve(inputPath));
        let toc;
        try {
            toc = parseYaml(readFileSync(path.join(directory, "toc.yaml"), "utf8"));
        } catch {
            return [];
        }
        if (!toc || !Array.isArray(toc.entries)) return [];

        const currentSlug = path.basename(inputPath, ".md");
        const relativeDirectory = relativeFromInput(directory);

        const buildCard = (leaf) => {
            if (!leaf || typeof leaf.page !== "string" || typeof leaf.title !== "string") return null;
            if (leaf.page === currentSlug) return null;

            let description = "";
            for (const candidate of [
                path.join(directory, `${leaf.page}.md`),
                path.join(directory, leaf.page, "index.md"),
            ]) {
                try {
                    const frontmatter = matter(readFileSync(candidate, "utf8")).data;
                    if (typeof frontmatter.description === "string") description = frontmatter.description;
                    break;
                } catch {
                    // Try the next candidate; a card without a target file
                    // still renders, same trust model as the sidebar.
                }
            }

            const segments = [
                vendor,
                product,
                relativeDirectory,
                leaf.page === "index" ? "" : leaf.page,
            ].filter(Boolean);
            return {
                title: leaf.title,
                href: `/${segments.join("/")}`,
                description,
            };
        };

        const groups = [];
        for (const entry of toc.entries) {
            if (Array.isArray(entry?.pages)) {
                const cards = entry.pages.map(buildCard).filter(Boolean);
                const heading = typeof entry.section === "string" ? entry.section : "";
                if (cards.length > 0) groups.push({ heading, cards });
                continue;
            }
            const card = buildCard(entry);
            if (!card) continue;
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.heading === "") {
                lastGroup.cards.push(card);
            } else {
                groups.push({ heading: "", cards: [card] });
            }
        }
        return groups;
    });

    eleventyConfig.addFilter("formatDate", (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    });

    return {
        dir: {
            input: inputDir,
            output: process.env.WIKI_OUTPUT_DIR || "_site",
            includes: "_includes",
            layouts: "_includes",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
}
