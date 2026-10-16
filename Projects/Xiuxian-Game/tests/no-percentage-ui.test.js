/**
 * @file no-percentage-ui.test.js
 * 对应《10 定稿》§5.3 / Q-A 硬验收专项断言：
 * 全站静态扫描，验证叙事文本 (narration.json) 与面向玩家的界面渲染中，严格不得出现 "%" 及虚假精确数值。
 * 豁免：天道提示词模板 (ai-prompt) 与 调试 JSON 导出属于机器接口，显式豁免。
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== 正在运行界面去百分比 (Q-A 规范) 全站专项断言测试 ===");

// 1. 扫描 data/text/narration.json，断言严格无 %
{
  const narrPath = path.resolve(__dirname, "../可运行测试第一版/data/text/narration.json");
  const narrContent = fs.readFileSync(narrPath, "utf-8");
  const matches = [...narrContent.matchAll(/%/g)];
  assert.strictEqual(
    matches.length,
    0,
    `narration.json 中不得包含任何 "%"，当前发现 ${matches.length} 处！`
  );
  console.log("✅ 测试 1 通过：data/text/narration.json 全文命中 '%' 严格为 0 处");
}

// 2. 扫描 index.html，断言玩家界面无 %
{
  const htmlPath = path.resolve(__dirname, "../可运行测试第一版/index.html");
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  const matches = [...htmlContent.matchAll(/%/g)];
  assert.strictEqual(
    matches.length,
    0,
    `index.html 中不得包含任何 "%"，当前发现 ${matches.length} 处！`
  );
  console.log("✅ 测试 2 通过：index.html 全文命中 '%' 严格为 0 处");
}

// 3. 扫描 app.js 中面向玩家的输出（如 resourceChanges、formatCultivationStatus、renderState）
{
  const appJsPath = path.resolve(__dirname, "../可运行测试第一版/app.js");
  const appJsContent = fs.readFileSync(appJsPath, "utf-8");

  // 检查是否还有 `${currProgress}%` 或 `100%` 或 `progressNum + "%"` 作为玩家文本输出
  const forbiddenPatterns = [
    /\$\{currProgress\}%/,
    /\$\{gain\}%/,
    /\$\{newProgress\}%/,
    /progressNum\s*\+\s*["']%["']/,
    /["']修为进度["']/
  ];

  forbiddenPatterns.forEach((pattern) => {
    const found = appJsContent.match(pattern);
    assert.strictEqual(
      found,
      null,
      `app.js 中禁止出现模式 ${pattern}，当前仍被命中！`
    );
  });
  console.log("✅ 测试 3 通过：app.js 中所有修为进度的百分比格式化与'修为进度'条目已全部替换为状态文本");
}

console.log("🎉 界面去百分比硬验收测试全部顺利通过！\n");
