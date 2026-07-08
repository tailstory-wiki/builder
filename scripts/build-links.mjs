#!/usr/bin/env node
// Convert the links.yaml at the root of CONTENT_DIR (if present) into
// links.json under OUT_DIR, validated against the JSON Schema 2020-12 file
// at SCHEMA. A missing links.yaml is not an error: links are optional.

import { readFile, writeFile, mkdir } from "node:fs/promises";
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

async function main() {
    const src = path.join(contentDir, "links.yaml");
    let yamlText;
    try {
        yamlText = await readFile(src, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log(`no links.yaml found under ${contentDir}, skipping`);
            return;
        }
        throw err;
    }

    const schemaText = await readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaText);
    const schemaId = schema.$id || pathToFileURL(path.resolve(schemaPath)).href;
    registerSchema(schema, schemaId);
    const validateLinks = await validate(schemaId);

    let data;
    try {
        data = parseYaml(yamlText);
    } catch (err) {
        console.error(`::error file=${src}::failed to parse YAML: ${err.message}`);
        process.exit(1);
    }

    const result = validateLinks(data, BASIC);
    if (!result.valid) {
        console.error(`::error file=${src}::links failed schema validation`);
        for (const err of result.errors ?? []) {
            console.error(
                `  - ${err.absoluteKeywordLocation} at ${err.instanceLocation}`,
            );
        }
        process.exit(1);
    }

    const dest = path.join(outDir, "links.json");
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, JSON.stringify(data, null, 2) + "\n");
    console.log(`Built ${dest}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
