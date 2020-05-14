const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const CleanCSS = require("clean-css");
const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.setTemplateFormats(["png"]);

  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Get the first `n` elements of a collection.
  eleventyConfig.addFilter("head", (array, n) => {
    return (n < 0) ? array.slice(n) : array.slice(0, n);
  });

  // format given string using markdown
  eleventyConfig.addNunjucksFilter("md", function(string) {
    let mdlib = markdownIt();
    return mdlib.renderInline(string);
  });
}
