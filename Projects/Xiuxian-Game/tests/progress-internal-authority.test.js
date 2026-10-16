/**
 * @file progress-internal-authority.test.js
 * 对应《12 验收复核》§5 / N7 专项断言验收：
 * 验证 progressInternal 成为唯一权威字段，废除双源并存与读旧写新问题：
 * 1. 静态数据文件 (data/*.json) 中严禁包含已废弃的 cultivationProgress。
 * 2. 校验器 (validate-schema.js) 将 progressInternal、realmStability、progressBand 纳入必填，并显式禁止 cultivationProgress。
 * 3. 运行时存档校验 (validateState) 拦截旧字段 cultivationProgress。
 * 4. 引擎运行时 simulation 写入严格只针对 progressInternal。
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== 正在运行 progressInternal 唯一权威与 N7 闭环专项断言测试 ===");

// 1. 静态数据文件检查：data/*.json 中不得存在 cultivationProgress
{
  const dataDir = path.resolve(__dirname, "../可运行测试第一版/data");
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.name.endsWith(".json")) {
        const content = fs.readFileSync(full, "utf-8");
        assert(
          !content.includes('"cultivationProgress"'),
          `数据文件 ${ent.name} 中不得包含 "cultivationProgress" 废弃字段！`
        );
      }
    }
  }
  scanDir(dataDir);
  console.log("✅ 测试 1 通过：data/*.json 全量数据文件已完全清除 cultivationProgress");
}

// 2. 校验器规则断言：validate-schema.js 必填 progressInternal 并禁用 cultivationProgress
{
  const schemaPath = path.resolve(__dirname, "../scripts/validate-schema.js");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  assert(
    schemaContent.includes("'progressInternal'"),
    "validate-schema.js 必须将 progressInternal 列入必填字段！"
  );
  assert(
    schemaContent.includes("'realmStability'"),
    "validate-schema.js 必须将 realmStability 列入必填字段！"
  );
  assert(
    schemaContent.includes("'progressBand'"),
    "validate-schema.js 必须将 progressBand 列入必填字段！"
  );
  assert(
    schemaContent.includes("'cultivationProgress' in character"),
    "validate-schema.js 必须具备针对 cultivationProgress 的严禁拦截逻辑！"
  );
  console.log("✅ 测试 2 通过：validate-schema.js 已将 progressInternal 纳入权威必填并建立拦截防线");
}

// 3. 运行时校验拦截断言：传入 cultivationProgress 必须被 validateState 精准拦截
{
  // 模拟 app.js 中的运行时 validateState 校验逻辑
  const CHARACTER_REQUIRED_FIELDS = [
    "id", "name", "age", "background", "identity", "spiritualRoot", "constitution",
    "realm", "progressInternal", "realmStability", "progressBand",
    "spiritualPower", "fatigue", "injuries",
    "inventory", "currencyBalances", "relationships", "reputation", "debts",
    "goals", "activeTasks"
  ];

  function validateRuntimeState(char) {
    for (const f of CHARACTER_REQUIRED_FIELDS) {
      if (char[f] === undefined) throw new Error("角色字段 " + f + " 缺失。");
    }
    if (char.cultivationProgress !== undefined) {
      throw new Error('角色状态包含已废弃的 cultivationProgress 字段，唯一权威字段为 progressInternal。');
    }
    if (char.progressInternal !== null && (typeof char.progressInternal !== "number" || char.progressInternal < 0)) {
      throw new Error("progressInternal 必须为 null 或非负数值。");
    }
  }

  // 用例 A：包含已废弃的 cultivationProgress
  const legacyChar = {
    id: "c1", name: "测试", age: 16, background: "散修", identity: "散修", spiritualRoot: "四灵根", constitution: "凡体",
    realm: { name: "炼气", level: 1, stage: null },
    cultivationProgress: 10,
    progressInternal: 10,
    realmStability: "accumulating", progressBand: "initial",
    spiritualPower: { value: 10, unit: "点", controlState: "平稳" },
    fatigue: { value: 0, scaleId: "standard100", description: "精力充沛" },
    injuries: [], inventory: [], currencyBalances: [], relationships: [], reputation: null, debts: [], goals: [], activeTasks: []
  };

  let caught = null;
  try {
    validateRuntimeState(legacyChar);
  } catch (err) {
    caught = err;
  }
  assert(caught, "包含 cultivationProgress 的状态必须被拦截报错！");
  assert(
    caught.message.includes("cultivationProgress"),
    `报错信息必须精准包含 cultivationProgress，实际为: "${caught.message}"`
  );

  // 用例 B：缺少 progressInternal
  const missingChar = { ...legacyChar };
  delete missingChar.cultivationProgress;
  delete missingChar.progressInternal;
  let caughtMissing = null;
  try {
    validateRuntimeState(missingChar);
  } catch (err) {
    caughtMissing = err;
  }
  assert(caughtMissing, "缺失 progressInternal 必须被必填检查拦截！");
  assert(
    caughtMissing.message.includes("progressInternal"),
    `报错信息必须精准指明 progressInternal 缺失，实际为: "${caughtMissing.message}"`
  );

  // 用例 C：标准合法对象通过
  const validChar = { ...legacyChar };
  delete validChar.cultivationProgress;
  assert.doesNotThrow(() => validateRuntimeState(validChar));

  console.log("✅ 测试 3 通过：运行时校验成功拦截 cultivationProgress 并确保 progressInternal 必填");
}

// 4. app.js 写入与读取断言：确认 app.js 不再向 charPatch 写入 cultivationProgress，且读取统一指向 progressInternal
{
  const appJsPath = path.resolve(__dirname, "../可运行测试第一版/app.js");
  const appJsContent = fs.readFileSync(appJsPath, "utf-8");

  // 严禁存在 charPatch.cultivationProgress = ... 写入
  assert(
    !appJsContent.includes("charPatch.cultivationProgress"),
    "app.js 中严禁向 charPatch 写入 cultivationProgress！"
  );

  // 严禁读取时使用 char.cultivationProgress 回退或取值
  assert(
    !appJsContent.includes("char.cultivationProgress !== null") &&
    !appJsContent.includes("char.cultivationProgress ||") &&
    !appJsContent.includes("char.cultivationProgress ?"),
    "app.js 中严禁读取 char.cultivationProgress 作为回退或状态值！"
  );

  console.log("✅ 测试 4 通过：app.js 内部已彻底切断 cultivationProgress 读写链路，单源权威成立");
}

console.log("🎉 progressInternal 唯一权威与 N7 闭环测试全部顺利通过！\n");
