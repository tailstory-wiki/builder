#!/usr/bin/env node
// Copy every Markdown source under CONTENT_DIR into OUT_DIR at the same
// pretty-permalink location Eleventy uses, named index.md, so the raw source
// ships to R2 alongside the rendered index.html and the worker can serve it
// for "View as Markdown".

import { readdir, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const contentDir = process.env.CONTENT_DIR;
const outDir = process.env.OUT_DIR;

if (!contentDir || !outDir) {
    console.error("CONTENT_DIR and OUT_DIR environment variables are required");
    process.exit(2);
}

async function* walk(dir) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
    }
    for (const entry of entries) {
        // Skip the layouts symlinked into the content tree; they hold no pages.
        if (entry.isDirectory()) {
            if (entry.name === "_includes") continue;
            yield* walk(path.join(dir, entry.name));
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            yield path.join(dir, entry.name);
        }
    }
}

// Mirror Eleventy's default pretty permalinks: index.md stays at its directory
// root, every other foo.md becomes foo/index.md.
function destFor(rel) {
    const dir = path.dirname(rel);
    const base = path.basename(rel);
    if (base === "index.md") return path.join(dir, "index.md");
    return path.join(dir, path.basename(base, ".md"), "index.md");
}

async function main() {
    if (!existsSync(contentDir)) {
        console.error(`CONTENT_DIR does not exist: ${contentDir}`);
        process.exit(2);
    }

    let count = 0;
    for await (const src of walk(contentDir)) {
        const rel = path.relative(contentDir, src);
        const dest = path.join(outDir, destFor(rel));

        await mkdir(path.dirname(dest), { recursive: true });
        await copyFile(src, dest);
        count += 1;
        console.log(`Built ${dest}`);
    }

    if (count === 0) {
        console.log(`::warning::no .md files found under ${contentDir}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
