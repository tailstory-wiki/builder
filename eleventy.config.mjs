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

    // Cards for landing.njk: the current directory's toc.yaml entries, minus
    // the entry for the landing page itself, each enriched with the target
    // page's `description` frontmatter and a site-absolute href.
    eleventyConfig.addFilter("landingCards", (inputPath) => {
        if (!inputPath) return [];
        const dir = path.dirname(path.resolve(inputPath));
        let toc;
        try {
            toc = parseYaml(readFileSync(path.join(dir, "toc.yaml"), "utf8"));
        } catch {
            return [];
        }
        if (!toc || !Array.isArray(toc.entries)) return [];

        // Flatten {section, pages} groups; the sidebar preserves grouping.
        const leaves = toc.entries.flatMap((entry) =>
            Array.isArray(entry?.pages) ? entry.pages : [entry],
        );

        const currentSlug = path.basename(inputPath, ".md");
        const relDir = relativeFromInput(dir);

        const cards = [];
        for (const leaf of leaves) {
            if (!leaf || typeof leaf.page !== "string" || typeof leaf.title !== "string") continue;
            if (leaf.page === currentSlug) continue;

            let description = "";
            for (const candidate of [
                path.join(dir, `${leaf.page}.md`),
                path.join(dir, leaf.page, "index.md"),
            ]) {
                try {
                    const data = matter(readFileSync(candidate, "utf8")).data;
                    if (typeof data.description === "string") description = data.description;
                    break;
                } catch {
                    // Try the next candidate; a card without a target file
                    // still renders, same trust model as the sidebar.
                }
            }

            const parts = [
                vendor,
                product,
                relDir,
                leaf.page === "index" ? "" : leaf.page,
            ].filter(Boolean);
            cards.push({
                title: leaf.title,
                href: `/${parts.join("/")}`,
                description,
            });
        }
        return cards;
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
