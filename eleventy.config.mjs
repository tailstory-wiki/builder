import { execFileSync } from "node:child_process";
import path from "node:path";
import markdownIt from "markdown-it";

const inputDir = process.env.WIKI_INPUT_DIR || "docs";
const docsRepo = process.env.WIKI_DOCS_REPO || "";
const docsRef = process.env.WIKI_DOCS_REF || "main";
const docsPath = process.env.WIKI_DOCS_PATH || "docs";

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
