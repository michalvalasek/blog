const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const CleanCSS = require("clean-css");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });
}
