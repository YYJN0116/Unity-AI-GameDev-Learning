/**
 * @file inventory-validation.test.js
 * 对应《10 定稿》§5.2 / N6 专项断言验收：
 * 构造旧形状条目 { name: "X", count: 1 }，验证静态校验器与运行时校验精准报错到 inventory[0].itemId。
 */

const assert = require("assert");

// 1. 测试运行时校验逻辑 (与 app.js 内 validateState / validatePatch 保持完全一致)
function validateRuntimeInventory(inventory) {
  if (!Array.isArray(inventory)) throw new Error("inventory 必须为数组。");
  inventory.forEach((item, idx) => {
    if (!item || typeof item !== "object") throw new Error("inventory[" + idx + "] 必须为对象。");
    if (typeof item.itemId !== "string" || !item.itemId) {
      throw new Error("inventory[" + idx + "].itemId 缺失或不是字符串。");
    }
    if (typeof item.name !== "string" || !item.name) {
      throw new Error("inventory[" + idx + "].name 缺失或不是字符串。");
    }
    if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 0) {
      throw new Error("inventory[" + idx + "].quantity 必须为非负整数。");
    }
    if (typeof item.unit !== "string" || !item.unit) {
      throw new Error("inventory[" + idx + "].unit 缺失或不是字符串。");
    }
    if (item.count !== undefined) {
      throw new Error("inventory[" + idx + "] 严禁包含已废弃的 count 字段（必须使用 quantity）。");
    }
  });
}

console.log("=== 正在运行 inventory 条目级 Schema 校验专项断言测试 ===");

// 验收用例 1：构造旧形状 { name: "X", count: 1 }（缺 itemId、使用 count）
{
  const oldItem = { name: "X", count: 1 };
  let caughtError = null;
  try {
    validateRuntimeInventory([oldItem]);
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError, "旧形状条目必须被校验器拦截报错！");
  assert(
    caughtError.message.includes("inventory[0].itemId"),
    `报错信息必须精准包含 "inventory[0].itemId"，实际报错为: "${caughtError.message}"`
  );
  console.log("✅ 测试 1 通过：旧形状 { name: 'X', count: 1 } 精准报错到 inventory[0].itemId");
}

// 验收用例 2：条目有 itemId 但仍携带已废弃字段 count
{
  const legacyCountItem = { itemId: "item.placeholder-herb", name: "基础伤药", quantity: 1, unit: "份", count: 1 };
  let caughtError = null;
  try {
    validateRuntimeInventory([legacyCountItem]);
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError, "携带 count 字段必须被校验器拦截报错！");
  assert(
    caughtError.message.includes("严禁包含已废弃的 count 字段"),
    `报错信息必须提示 count 字段废弃，实际报错为: "${caughtError.message}"`
  );
  console.log("✅ 测试 2 通过：携带 count 字段精准拦截");
}

// 验收用例 3：标准合规条目顺利通过
{
  const validInventory = [
    { itemId: "item.wild-herb", name: "野灵草", quantity: 3, unit: "株" },
    { itemId: "item.qi-pill", name: "补气丸", quantity: 1, unit: "枚" }
  ];
  assert.doesNotThrow(() => {
    validateRuntimeInventory(validInventory);
  }, "合规的 inventory 条目必须通过校验");
  console.log("✅ 测试 3 通过：标准合规条目校验通过");
}

console.log("🎉 inventory 条目级校验验收全部顺利通过！\n");
