const { transformFileSync } = require("@babel/core");
const autoI18nPlugin = require("./plugin/auto-i18n-plugin.js");
const path = require("path");

const { code } = transformFileSync(
  path.join(__dirname, "./code/source-code.js"),
  {
    plugins: [[autoI18nPlugin, { outputDir: path.join(__dirname, "./i18n") }]],
    parserOpts: {
      plugins: ["jsx"],
    },
  }
);
console.log(code);
