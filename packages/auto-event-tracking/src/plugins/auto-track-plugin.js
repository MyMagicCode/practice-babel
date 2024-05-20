/**
 * 自动埋点插件
 * 1. 检查 Program 节点，是否有引入 trackerPath，如果没有则添加默认导入
 * 2. 插入埋点代码
 */
import importModule from "@babel/helper-module-imports";

export default function (api, options) {
  return {
    visitor: {
      // 检查 Program 节点，是否有引入 trackerPath，如果没有则添加默认导入
      // 第一种自动引入包的visitor实现方式
      Program(path, state) {
        // 查找 Program 节点下的所有模块路径是否包含 trackerPath
        const trackerPath = state.opts.trackerPath;
        const modulePaths = Object.values(path.scope.bindings).filter(
          (binding) => {
            if (binding.kind === "module") {
              return binding.path.parent.source.value === trackerPath;
            } else {
              return false;
            }
          }
        );
        if (modulePaths.length === 0) {
          // 如果没有找到 trackerPath，则添加默认导入，并记录名称
          state.trackerImportId = importModule.addDefault(path, trackerPath, {
            nameHint: path.scope.generateUid(trackerPath),
          }).name;
        } else {
          // 记录 trackerPath 导入的函数名称
          state.trackerImportId = modulePaths[0].identifier.name;
        }
        // 生成埋点代码的 AST
        state.trackerAST = api.template.statement(
          `${state.trackerImportId}()`
        )();
      },
      // 插入埋点代码
      // Function 是 'ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration' 的别名
      Function(path, state) {
        const bodyPath = path.get("body");
        if (bodyPath.isBlockStatement()) {
          // 插入埋点代码
          bodyPath.node.body.unshift(state.trackerAST);
        } else {
          // 特殊情况没有大括号，需要添加大括号：()=>123;
          // 方式一：使用 blockStatement
          const blockStatement = api.types.blockStatement([
            state.trackerAST,
            api.types.returnStatement(bodyPath.node),
          ]);
          // 方式二：使用 template
          // const blockStatement = api.template.statement(
          //   `{ ${state.trackerImportId}(); return %%RETURN_VALUE%%; }`
          // )({
          //   RETURN_VALUE: bodyPath.node,
          // });

          bodyPath.replaceWith(blockStatement);
        }
      },
    },
  };
}

// 第二种自动引入包的visitor实现方式
// Program(path, state) {
//   console.time("Execution Time");
//   path.traverse({
//     ImportDeclaration(curPath) {
//       const requirePath = curPath.get("source").node.value;
//       if (requirePath === options.trackerPath) {
//         // 如果已经引入了
//         const specifierPath = curPath.get("specifiers.0");
//         if (specifierPath.isImportSpecifier()) {
//           state.trackerImportId = specifierPath.toString();
//         } else if (specifierPath.isImportNamespaceSpecifier()) {
//           state.trackerImportId = specifierPath.get("local").toString(); // tracker 模块的 id
//         }
//         curPath.stop(); // 找到了就终止遍历
//       }
//     },
//   });
//   if (!state.trackerImportId) {
//     state.trackerImportId = importModule.addDefault(path, "tracker", {
//       nameHint: path.scope.generateUid("tracker"),
//     }).name; // tracker 模块的 id
//     // state.trackerAST = api.template.statement(
//     //   `${state.trackerImportId}()`
//     // )(); // 埋点代码的 AST
//   }
//   console.timeEnd("Execution Time");
// },
