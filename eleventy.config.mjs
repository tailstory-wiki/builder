import markdownIt from "markdown-it";

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
            includes: "_includes",
            layouts: "_includes",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
}
