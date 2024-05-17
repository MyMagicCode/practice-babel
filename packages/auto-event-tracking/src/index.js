import { transformFileSync } from "@babel/core";
import autoTrackPlugin from "./plugins/auto-track-plugin.js";
import path from "path";
import { fileURLToPath } from "url";

// ES6 模块规范获取文件路径信息
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { code: newCode } = transformFileSync(
  path.join(__dirname, "/code/source-code.js"),
  {
    plugins: [[autoTrackPlugin, { trackerPath: "auto-track" }]],
    parserOpts: {
      sourceType: "unambiguous",
    },
  }
);

console.log(newCode);
