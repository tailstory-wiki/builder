import markdownIt from "markdown-it";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  eleventyConfig.setLibrary("md", markdownIt({
    html: true,
    linkify: true,
    typographer: false,
  }));

  return {
    dir: {
      input: process.env.WIKI_INPUT_DIR || "docs",
      output: process.env.WIKI_OUTPUT_DIR || "_site",
      includes: path.join(__dirname, "_includes"),
      layouts: path.join(__dirname, "_includes"),
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
