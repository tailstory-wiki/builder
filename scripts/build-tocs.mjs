#!/usr/bin/env node
// Convert every toc.yaml under CONTENT_DIR into a JSON file under OUT_DIR,
// and validate each result against the JSON Schema 2020-12 file at SCHEMA.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import {
    registerSchema,
    validate,
} from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";

const contentDir = process.env.CONTENT_DIR;
const outDir = process.env.OUT_DIR;
const schemaPath = process.env.SCHEMA;

if (!contentDir || !outDir || !schemaPath) {
    console.error("CONTENT_DIR, OUT_DIR and SCHEMA environment variables are required");
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
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full);
        } else if (entry.isFile() && entry.name === "toc.yaml") {
            yield full;
        }
    }
}

async function main() {
    if (!existsSync(contentDir)) {
        console.error(`CONTENT_DIR does not exist: ${contentDir}`);
        process.exit(2);
    }

    const schemaText = await readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaText);
    const schemaId = schema.$id || pathToFileURL(path.resolve(schemaPath)).href;
    registerSchema(schema, schemaId);
    const validateToc = await validate(schemaId);

    let count = 0;
    let failed = 0;
    for await (const src of walk(contentDir)) {
        const rel = path.relative(contentDir, path.dirname(src));
        const dest = path.join(outDir, rel, "toc.json");

        const yamlText = await readFile(src, "utf8");
        let data;
        try {
            data = parseYaml(yamlText);
        } catch (err) {
            console.error(`::error file=${src}::failed to parse YAML: ${err.message}`);
            failed += 1;
            continue;
        }

        const result = validateToc(data, BASIC);
        if (!result.valid) {
            failed += 1;
            console.error(`::error file=${src}::TOC failed schema validation`);
            for (const err of result.errors ?? []) {
                console.error(
                    `  - ${err.absoluteKeywordLocation} at ${err.instanceLocation}`,
                );
            }
            continue;
        }

        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, JSON.stringify(data, null, 2) + "\n");
        count += 1;
        console.log(`Built ${dest}`);
    }

    if (failed > 0) {
        console.error(`${failed} TOC file(s) failed validation`);
        process.exit(1);
    }
    if (count === 0) {
        console.log(`::warning::no toc.yaml files found under ${contentDir}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
