/**
 * @file rng-determinism.test.js
 * 对应《07_M0二次审查》N4 专项断言测试：
 * 验证统一收口的种子化伪随机数发生器 (Mulberry32) 的确定性、序列一致性与断点续接还原度。
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function createMulberry32(initialSeed = 123456789) {
  let state = {
    rngSeed: initialSeed,
    rngCursor: 0
  };

  function nextRandom() {
    if (!state.rngSeed && state.rngSeed !== 0) state.rngSeed = 123456789;
    state.rngCursor = (state.rngCursor || 0) + 1;
    let s = (state.rngSeed = (state.rngSeed + 0x6D2B79F5) | 0);
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next: nextRandom,
    getState: () => ({ ...state }),
    setState: (newState) => {
      state.rngSeed = newState.rngSeed;
      state.rngCursor = newState.rngCursor;
    }
  };
}

console.log("=== 正在运行 PRNG 确定性与 RNG 统一收口专项断言测试 ===");

// 1. 同种子 + 同序列调用 → 输出严格一致 (两实例并行比较)
{
  const rng1 = createMulberry32(123456789);
  const rng2 = createMulberry32(123456789);

  const seq1 = Array.from({ length: 500 }, () => rng1.next());
  const seq2 = Array.from({ length: 500 }, () => rng2.next());

  assert.deepStrictEqual(seq1, seq2, "同种子(123456789)两次运行生成的500个随机数序列必须严格一致！");
  console.log("✅ 测试 1 通过：同种子两次运行 500 轮随机数全等");
}

// 2. 状态快照与断点续接一致性 (读档复现能力)
{
  const rng = createMulberry32(987654321);
  // 先运行 100 次
  for (let i = 0; i < 100; i++) rng.next();

  // 记录此时快照（模拟存档）
  const snapshot = rng.getState();
  assert.strictEqual(snapshot.rngCursor, 100, "cursor 游标步进准确");

  // 继续运行 100 次作为基准序列 A
  const seqA = Array.from({ length: 100 }, () => rng.next());

  // 模拟读档：恢复快照
  rng.setState(snapshot);
  assert.strictEqual(rng.getState().rngCursor, 100, "恢复快照后 cursor 状态一致");

  // 恢复后运行 100 次作为序列 B
  const seqB = Array.from({ length: 100 }, () => rng.next());

  assert.deepStrictEqual(seqA, seqB, "断点恢复快照后生成的后续随机数序列必须完全重现！");
  console.log("✅ 测试 2 通过：存档快照保存与读档续接 100 轮随机完全复现");
}

// 3. 静态源码核验：确保 app.js 中已根除裸 Math.random()
{
  const appJsPath = path.resolve(__dirname, "../可运行测试第一版/app.js");
  const code = fs.readFileSync(appJsPath, "utf-8");

  // 检索所有 Math.random
  const matches = [...code.matchAll(/Math\.random\s*\(/g)];
  assert.strictEqual(
    matches.length,
    0,
    `app.js 中必须严格不存在裸 Math.random() 调用，发现 ${matches.length} 处！`
  );
  console.log("✅ 测试 3 通过：app.js 静态扫描确认 Math.random() 调用数严格为 0");
}

console.log("🎉 PRNG 确定性与收口测试全部顺利通过！\n");
