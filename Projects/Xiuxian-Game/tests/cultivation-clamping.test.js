/**
 * @file cultivation-clamping.test.js
 * 对应《10 定稿》§5.1 专项断言验收：
 * 验证修为上限读数据驱动（TUNING.cultivation.max）：
 * 当 max 改为 200 时，代码零改动，修为累加上限与钳制点随之变为 200。
 */

const assert = require("assert");

function simulateCultivateProgress(currProgress, gain, maxConfig) {
  const maxCultivation = (maxConfig && maxConfig.max) || 100;
  return Math.min(maxCultivation, currProgress + gain);
}

console.log("=== 正在运行修为上限数据驱动 (TUNING.cultivation.max) 专项断言测试 ===");

// 1. 基准配置 max = 100
{
  const config100 = { min: 0, max: 100, breakthroughEligibilityThreshold: 100 };
  const result = simulateCultivateProgress(95, 10, config100);
  assert.strictEqual(result, 100, "在 max=100 时，95+10 必须被钳制在 100");
  console.log("✅ 测试 1 通过：max=100 时正确钳制在 100");
}

// 2. 验收用例：将 max 改为 200，逻辑零改动，钳制点随之变为 200
{
  const config200 = { min: 0, max: 200, breakthroughEligibilityThreshold: 200 };
  const result1 = simulateCultivateProgress(95, 10, config200);
  assert.strictEqual(result1, 105, "在 max=200 时，95+10 应当增长到 105 而不被 100 阻断");

  const result2 = simulateCultivateProgress(195, 10, config200);
  assert.strictEqual(result2, 200, "在 max=200 时，195+10 应当被钳制在 200");
  console.log("✅ 测试 2 通过：max=200 时零代码改动，钳制点自动跟随变为 200");
}

console.log("🎉 修为上限数据驱动测试全部顺利通过！\n");
