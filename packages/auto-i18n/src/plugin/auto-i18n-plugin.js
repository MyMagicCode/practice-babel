/**
 * 自动国际化插件
 * 1. 自动导入intl，不需要就不导入
 * 2. 遍历所有字符串和模板字符串节点，替换为intl.t('id')函数
 * 3. 生成国际化资源文件
 * todo: 当前插件还有很多问题，比如：
 * .处理了class属性的字符串，实际上是不需要处理的
 * .过多的字符串被处理了
 */
const { declare } = require("@babel/helper-plugin-utils");
const fse = require("fs-extra");
const path = require("path");
module.exports = declare((api, options) => {
  // 校验babel版本
  api.assertVersion(7);
  return {
    pre(file) {
      file.set("allText", {});
    },
    visitor: {
      // 自动导入intl功能
      Program: {
        enter(path, state) {
          // 遍历path节点，判断是否导入了intl
          path.traverse({
            ImportDeclaration(p) {
              // 获取导入的模块名称
              const sourceName = p.get("source").node.value;
              if (sourceName === "intl") {
                // 如果导入了intl，就记录导入变量id，并停止遍历
                const specifier = p.get("specifiers.0");
                state.intlImportId = specifier.toString();
                p.stop();
              }
            },
          });
          // 如果没有id，就生成一个id，暂时不做导入，等exit的时候判断是否需要导入，需要才导入。
          if (!state.intlImportId) {
            state.intlImportId = path.scope.generateUid("intl");
          }
        },
        exit(path, state) {
          // 判断是否有需要翻译，需要就导入intl
          if (Reflect.ownKeys(state.file.get("allText")).length > 0) {
            // 插入import语句
            path.node.body.unshift(
              api.template.statement(
                `import ${state.intlImportId} from 'intl';`
              )()
            );
          }
        },
      },
      // 替换StringLiteral节点为翻译函数
      StringLiteral(path, state) {
        if (isSkipNode(path)) {
          return;
        }
        const initId = getIntlId();
        const text = path.node.value;
        // 保存翻译文本
        state.file.get("allText")[initId] = text;
        // 替换节点，需要处理jsx标签的属性问题
        path.replaceWith(
          getReplaceExpression(api, path, state.intlImportId, initId)
        );
        path.skip();
      },
      // 替换TemplateLiteral节点为翻译函数
      TemplateLiteral(path, state) {
        if (isSkipNode(path)) {
          return;
        }
        // 获取模板字符串的值
        const value = path
          .get("quasis")
          .map((item) => item.node.value.raw)
          .join("{placeholder}");
        if (value) {
          const initId = getIntlId();
          // 保存翻译文本
          state.file.get("allText")[initId] = value;
          // 替换节点，需要处理jsx标签的属性问题
          path.replaceWith(
            getReplaceExpression(api, path, state.intlImportId, initId)
          );
          path.skip();
        }
      },
    },
    post(file) {
      const allText = file.get("allText");
      const content = `const resource = ${JSON.stringify(
        allText,
        null,
        4
      )};\nexport default resource;`;
      fse.ensureDirSync(options.outputDir);
      fse.writeFileSync(path.join(options.outputDir, "zh_CN.js"), content);
      fse.writeFileSync(path.join(options.outputDir, "en_US.js"), content);
    },
  };
});

/**
 * 判断节点是否为导入节点，或是否有i18n-disable注释，有的话就跳过
 * @param {*} path 判断节点
 * @returns
 */
function isSkipNode(path) {
  const leadingComments = path.node.leadingComments;
  if (leadingComments) {
    return leadingComments.some((comment) =>
      comment.value.includes("i18n-disable")
    );
  } else {
    let flag = false;
    path.findParent((p) => {
      if (flag === false) flag = p.isImportDeclaration();
    });
    return flag;
  }
}

let intlId = 0;
/** 获取国际化id */
function getIntlId() {
  return `intl${intlId++}`;
}
/**
 * 模板字符串和字符串替换为翻译函数
 * @param {*} api plugin传入的api对象
 * @param {*} path 当前模板字符串path
 * @param {*} importId intl导入id
 * @param {*} initId 当前内容的id
 * @returns
 */
function getReplaceExpression({ template, types }, path, importId, initId) {
  const expressionParams = path.isTemplateLiteral()
    ? path.get("expressions").map((item) => item.toString())
    : [];
  const tl = `${importId}.t('${initId}',${expressionParams.join(",")})`;
  let replaceExpression = template.expression(tl)();

  // 判断是不是JSX属性，如果是就包裹一层大括号（jsx内容表达式）
  if (
    path.findParent((it) => it.isJSXAttribute()) &&
    !path.findParent((p) => p.isJSXExpressionContainer())
  ) {
    console.log(11);
    replaceExpression = types.JSXExpressionContainer(replaceExpression);
  }

  return replaceExpression;
}
