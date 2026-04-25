import markdownIt from "markdown-it";

export default function (eleventyConfig) {
    eleventyConfig.setLibrary("md", markdownIt({
        html: true,
        linkify: true,
        typographer: false,
    }));

    const docsSha = process.env.WIKI_DOCS_SHA || "";
    eleventyConfig.addGlobalData("docsSha", docsSha);
    eleventyConfig.addGlobalData("docsShaShort", docsSha ? docsSha.slice(0, 7) : "");

    return {
        dir: {
            input: process.env.WIKI_INPUT_DIR || "docs",
            output: process.env.WIKI_OUTPUT_DIR || "_site",
            includes: "_includes",
            layouts: "_includes",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
}
