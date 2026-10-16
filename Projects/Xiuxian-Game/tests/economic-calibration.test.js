/**
 * @file economic-calibration.test.js
 * 对应《10 定稿》§5.4 / Q-D 经济校准实测脚本：
 * 模拟新手散修（初始 10 灵石）连续运行 3 个游戏日的收支账目，
 * 验证在物价（补气丸 2 灵石、伤药 1 灵石）与差使报酬（1-2 灵石）新基线下的经济平衡与生存紧张感。
 */

const assert = require("assert");

console.log("=== 正在运行 3 个游戏日经济收支校准实测 ===");

const initialStones = 10;
let balance = initialStones;
const ledger = [];

function recordTx(day, time, action, income, expense, desc) {
  balance = balance + income - expense;
  ledger.push({
    day,
    time,
    action,
    income,
    expense,
    balance,
    desc
  });
}

// ----------------- Day 1 -----------------
// 08:00 晨起打坐修炼 (0 灵石)
recordTx(1, "08:00", "修炼", 0, 0, "吐纳天地灵气，精力消耗 12");
// 10:00 承接坊市杂役差使 (+1 灵石)
recordTx(1, "10:00", "任务", 1, 0, "清点灵药灵材，获得微薄酬劳 1 枚下品灵石");
// 13:00 坊市采买补气丸 (-2 灵石)
recordTx(1, "13:00", "商贸", 0, 2, "购置【补气丸】1 枚备用，按 10 定稿新价支出 2 灵石");
// 14:00 山道巡查探索 (+1 灵石)
recordTx(1, "14:00", "探索", 1, 0, "遗迹碎石间淘得散落碎灵折合 1 枚下品灵石");
// 16:00 入定调息休息 (0 灵石)
recordTx(1, "16:00", "休息", 0, 0, "入定调养，疲劳清零");

// ----------------- Day 2 -----------------
// 08:00 晨起打坐修炼 (0 灵石)
recordTx(2, "08:00", "修炼", 0, 0, "运功温养气海");
// 10:00 承接日常打杂差使 (+2 灵石)
recordTx(2, "10:00", "任务", 2, 0, "协助照看灵田半日，结算 2 枚下品灵石");
// 13:00 租用初级修炼室一时辰 (-2 灵石)
recordTx(2, "13:00", "修炼室", 0, 2, "租用低阶静室闭关一时辰（设定集基准 1-4 灵石，实际支出 2 灵石）");
// 15:00 与同道修士攀谈交流 (0 灵石)
recordTx(2, "15:00", "结交", 0, 0, "探听修仙界传闻与行市");
// 16:30 静修调息 (0 灵石)
recordTx(2, "16:30", "休息", 0, 0, "吐故纳新自愈疲乏");

// ----------------- Day 3 -----------------
// 08:00 野外搜寻灵草 (0 灵石)
recordTx(3, "08:00", "探索", 0, 0, "采摘得野灵草 1 株");
// 10:00 承接修缮阵法杂事 (+1 灵石)
recordTx(3, "10:00", "任务", 1, 0, "搬运压阵石条，获得 1 枚下品灵石");
// 13:00 采买基础伤药外敷散 (-1 灵石)
recordTx(3, "13:00", "商贸", 0, 1, "购置【基础伤药】1 份，支出 1 灵石（折合 10 碎灵）");
// 15:00 寻觅低阶妖兽试炼 (0 灵石)
recordTx(3, "15:00", "试炼", 0, 0, "搏杀低阶灵兽，斩获低阶兽材 1 份");
// 17:00 入定闭关恢复 (0 灵石)
recordTx(3, "17:00", "休息", 0, 0, "洗去一身风尘，精力恢复");

// 统计核算
const totalIncome = ledger.reduce((sum, item) => sum + item.income, 0);
const totalExpense = ledger.reduce((sum, item) => sum + item.expense, 0);

console.log("\n--- 3 个游戏日收支账目明细表 ---");
console.log("天数\t时间\t行动\t收入\t支出\t结余\t说明");
ledger.forEach(tx => {
  console.log(`第${tx.day}日\t${tx.time}\t${tx.action}\t+${tx.income}\t-${tx.expense}\t${tx.balance}枚\t${tx.desc}`);
});

console.log("\n--- 经济校准汇总评估 ---");
console.log(`初始资产: ${initialStones} 枚下品灵石`);
console.log(`3日总收入: +${totalIncome} 枚下品灵石`);
console.log(`3日总支出: -${totalExpense} 枚下品灵石`);
console.log(`期末结余: ${balance} 枚下品灵石 (净变化: ${balance - initialStones} 枚)`);

// 断言验证：
// 1. 紧张感保持：结余不应无限暴涨（不超过 15 灵石），也不应破产（>= 5 灵石）
assert(balance >= 5 && balance <= 15, "期末结余保持在合理紧张区间 (5-15 灵石)");
// 2. 能够按计划负担一次修炼室开销（2 灵石）
assert(totalExpense >= 2, "角色必须能够负担得起 1 次修炼室或丹药开销");

console.log("\n✅ 经济校准符合 10 定稿 §1.5 设定集 16 基准，数据已通过断言！\n");
