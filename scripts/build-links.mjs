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

const contentDirectory = process.env.CONTENT_DIR;
const outputDirectory = process.env.OUT_DIR;
const schemaPath = process.env.SCHEMA;

if (!contentDirectory || !outputDirectory || !schemaPath) {
    console.error("CONTENT_DIR, OUT_DIR and SCHEMA environment variables are required");
    process.exit(2);
}

async function main() {
    const sourcePath = path.join(contentDirectory, "links.yaml");
    let yamlText;
    try {
        yamlText = await readFile(sourcePath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log(`no links.yaml found under ${contentDirectory}, skipping`);
            return;
        }
        throw error;
    }

    const schemaText = await readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaText);
    const schemaId = schema.$id || pathToFileURL(path.resolve(schemaPath)).href;
    registerSchema(schema, schemaId);
    const validateLinks = await validate(schemaId);

    let data;
    try {
        data = parseYaml(yamlText);
    } catch (error) {
        console.error(`::error file=${sourcePath}::failed to parse YAML: ${error.message}`);
        process.exit(1);
    }

    const result = validateLinks(data, BASIC);
    if (!result.valid) {
        console.error(`::error file=${sourcePath}::links failed schema validation`);
        for (const validationError of result.errors ?? []) {
            console.error(
                `  - ${validationError.absoluteKeywordLocation} at ${validationError.instanceLocation}`,
            );
        }
        process.exit(1);
    }

    const destinationPath = path.join(outputDirectory, "links.json");
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`Built ${destinationPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
