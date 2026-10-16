# 《修仙世界纪录簿》数值基线 · 检定属性层 · DC 表 · Event Node Schema 定稿 v1

| 项目 | 内容 |
|---|---|
| **产出方** | 小肥（联合编剧与数值架构师） |
| **裁定方** | YY（2026-10-16） |
| **依据** | `26_GM_Realm_Progression_Quantification`、`16_GM_Core_Numeric_Baseline`、`12_GM_Progression_Resource_Engine`、`13_GM_Resolution_Protocol`、`02_GM_Factions_NPC_Framework`、`10_GM_Key_NPC_Motivation_Dossiers`、`v0.1-data-standard.md` |
| **替代** | 本文件取代《交接报告 v1》§6.1 的数值草案；与设定集冲突之处，一律以设定集为准 |
| **交付** | 四份规范合并为一份文件。**理由**：四者互相引用（属性层被 DC 表用、DC 表被 check 用、check 在 Event Node 里、数值被 Effect 改），拆成四份必然漂移 |

---

## 0. YY 裁定记录（2026-10-16）

| # | 议题 | YY 裁定 | 落地方式 |
|---|---|---|---|
| **Q-A** | 修为进度表示 | **内部分离**（方案 3） | 引擎保留不显示的 `progressInternal`；界面只显示 `realmStability` + `progressBand`；**硬验收：任何界面与叙事不得出现百分比** |
| **Q-B** | 突破条件 | **条件清单** | 设定集 `26` §3 的 8 维度落地为可执行 `activation` 条件；数值只承担其中「灵力积累」一项 |
| **Q-C** | 检定修正 | **加，总上限 ±3** | 大境界差距**不进修正，进条件门控** |
| **Q-D** | 物价 | **跟设定集** | 采用 `16` §2 基准；同步下调报酬以保住紧张感 |
| **Q-E** | 大成功 / 大失败 | **保留；重伤或死亡仅在严重情况下允许** | **见 §3.3 的正式化 —— 必须带「事前风险路径」前置条件** |
| **Q-F** | 补回缺失字段组 | **接受** | 新增 `techniqueMastery` 与 `understanding`，并补 `soulLoad` |

### Q-E 的正式化（这一条我加了硬约束）

YY 的原话是「要，但看情况，如果很严重的情况下可以是重伤或死亡」。**这句话必须被钉死，否则会退化成「主持端随口判死」。** 你设定集 `26` §4 原文：

> 严重后果**须事先存在合理风险路径**；**死亡不是常规失败结果。**

因此正式化为：

> **大失败本身不直接产生重伤或死亡。**
> 重伤 / 死亡只能在「**事前已存在、且角色能够察觉的风险路径**」成立时发生。

具体规则见 §3.3。**这条不是限制你，是保护你的玩家不会觉得死得莫名其妙。**

---

## 1. 数值基线 v0.2

### 1.1 状态字段总表

| 字段 | 类型 | 单位 / 量表 | 状态 | 依据 |
|---|---|---|---|---|
| `character.realm` | `{name, level, stage}` | — | 沿用 | `v0.1-data-standard` §1 |
| `character.realmStability` | enum | `unstable` 未稳固 / `stable` 已稳固 / `accumulating` 积累中 / `ready` 条件齐备 / `consolidating` 突破后待巩固 | **新增** | `26` §2 |
| `character.progressBand` | enum \| null | `initial` 初步 / `marked` 明显 / `near` 接近 | **新增**（仅 `accumulating` 时有值） | `26` §2 |
| `character.progressInternal` | number \| null | `scaleId: "internal-0-100"` | **新增 · 禁止显示** | Q-A |
| `character.cultivationScale` | object | `{display: false, unit: null}` | **新增**：显式声明本量表不对外展示 | Q-A |
| `character.spiritualPower` | `{value, unit, controlState}` | `unit` 必填 | 沿用 | `v0.1-data-standard` L57-61 |
| `character.spiritualPowerCap` | number | 同 `spiritualPower.unit` | **新增**：由 `tuning.realms` 表按境界给出，**代码不得再用 `层数 × 15`** | `26` §2「不以单一数字代替能力」 |
| `character.spiritualPowerControl` | enum | `steady` 平稳 / `fluctuating` 波动 / `disordered` 紊乱 | **新增** | `16` §5「灵力紊乱与外伤分开记录」 |
| `character.fatigue` | `{value, scaleId, description}` | `scaleId: "standard100"` | 沿用；阈值读 `tuning.fatigue` | `v0.1-data-standard` L62-66 |
| `character.soulLoad` | `{value, scaleId, description}` | `scaleId: "standard100"` | **新增**：神识负荷，与疲劳、外伤**分开** | `16` §5 |
| `character.techniqueMastery` | array | `[{techniqueId, stage, evidence: []}]` | **新增** | `12` §1 |
| `character.understanding` | array | `[{topicId, level, evidence: []}]` | **新增** | `12` §1 |
| `character.injuries` | array | 见 §1.2 | **扩展** | `16` §5 |
| `character.currencyBalances` | `[{unit, amount}]` | `unit` 为机器 id | 沿用 | `v0.1-data-standard` L96 |
| `character.inventory` | `[{itemId, name, quantity, unit, condition, ownerId}]` | — | 沿用 | `v0.1-data-standard` L95 |
| `character.relationships` | array | 多维离散，见《05 人物卡规范》§0.3 | 已落地 | `10` 规则 3 |

**`stage` 与 `level` 的取值域**（`techniqueMastery.stage` 与 `understanding.level` 共用）：

`未接触 → 初识 → 入门 → 熟练 → 精通 → 自成体系`（`12` §1 明文）

### 1.2 `injuries` 条目结构（`16` §5 八项必记）

```jsonc
{
  "id": "injury.meridian-strain",
  "part": "经脉",                       // 部位
  "type": "灵力反冲",                    // 类型
  "severity": "minor",                  // minor | restricting | severe | critical
  "restriction": "无法连续运功超过一时辰",  // 当前限制（具体行为）
  "treatment": "静养 / 温和丹药",         // 治疗方式
  "recoveryWindowDays": [3, 10],        // 估计恢复窗口（范围，不是精确值）
  "worseningCondition": "继续强行冲关",   // 恶化条件
  "sequelRisk": "低",                    // 是否可能留后患
  "occurredAtInGameDate": "0001-01-01"
}
```

**注意**：`severity: critical`（危急）**不能靠普通睡眠自动恢复**（`16` §5）。

### 1.3 钳制与越界规则

| 量 | 范围 | 越界处理 |
|---|---|---|
| `fatigue.value` | `tuning.fatigue.min ~ max` | **允许钳制**，且 `ledger` 标注 `"clamped": true` |
| `soulLoad.value` | 同量表范围 | **允许钳制**，同上 |
| `progressInternal` | 0 ~ 100 | **允许钳制**，同上 |
| `spiritualPower.value` | 0 ~ `spiritualPowerCap` | 不得越界；由 Effect 保证 |
| `currencyBalances[].amount` | ≥ 0 | **禁止钳制。越界即报错并中止该 Effect**（`04` 报告 O4 / `07` 报告 N2） |
| `inventory[].quantity` | ≥ 0 | **禁止钳制。越界即报错** |

**总原则**：**可恢复的生理/成长量可以钳；资源与物品不可以钳。** 后者越界一律视作编剧写错。

### 1.4 禁止项（写进校验器与自查清单）

- ❌ 全局生命值 `health`
- ❌ 全局经验值 / 修为点数
- ❌ 任何「单一数字代替角色能力」的做法（`26` §1.2）
- ❌ **界面或叙事中出现精确百分比**（Q-A 硬验收）
- ❌ 固定天数自动升级（`26` §1.1、`16` §4）
- ❌ 代码中出现魔法数字（一律读 `tuning.json`）

### 1.5 物价基线（Q-D：跟设定集）

采用 `16` §2 的普通地区基准，地区系数 0.7–1.6。

| 项目 | 设定集基准 | 折算（1 灵石 = 10 碎灵） |
|---|---:|---:|
| 修士简餐 / 基础补给 | 1–3 碎灵 | 0.1–0.3 |
| 常见低阶药材一份 | 1–8 碎灵 | 0.1–0.8 |
| 基础疗伤散 / 常见药剂 | 5–20 碎灵 | **0.5–2** |
| 普通低阶符箓 | 2–10 碎灵 | 0.2–1 |
| 简单修炼室一时辰 | 1–4 灵石 | **1–4** |
| 低阶修士一日基础开销 | 5–20 碎灵 | 0.5–2 |

**对现状的修正要求**：

| 项目 | 现状 | 应改为 |
|---|---|---|
| `item.qi-pill` 售价 | `buyCostAmount: 6`（= 60 碎灵） | **2**（= 20 碎灵，落在「常见药剂」区间上沿，对应「补气丸」这种稍好的药） |
| 杂事报酬 | 6–10 灵石 | **1–2 灵石**（否则「干一天活买五颗药」，紧张感完全消失） |

> ⚠️ **这两个数字必须由一次校准确定，不能拍脑袋。** 校准程序见 §5.4。**在 M1 事件接入之前到位即可，不阻塞当前工作。**

`16` §1 还规定：**灵石账目必须整数记录**；价格偏离基准时必须记录原因（供需/品质/稀缺/运输/风险/关系/季节/议价）。

---

## 2. 检定属性层

### 2.1 为什么要有这一层

`26` §1.2 要求「**不以单一数字代替角色能力**」，同时引擎需要可计算的判定量。

**这一层是那五个维度的可计算投影，不是替代品。** 它**不独立存储**——每次需要时由状态推导，避免出现「第二套真相」。

### 2.2 六个属性

| 属性 | 覆盖设定集维度 | 取值 |
|---|---|---|
| `daohang` 道行 | 境界 | 1–5 |
| `lingli` 灵力 | 灵力基础 | 1–5 |
| `shenshi` 神识 | 身体 / 神魂状态 | 1–5 |
| `shenfa` 身法 | 身体 / 神魂状态 | 1–5 |
| `wuxing` 悟性 | 理解与经验 | 1–5 |
| `xinzhi` 心志 | 身体 / 神魂状态 | 1–5 |

**档位语义**：1 拙劣 / 2 平平 / 3 尚可 / 4 出色 / 5 卓绝。

### 2.3 推导规则（写入 `tuning.attributes`，代码只查表）

| 属性 | 推导来源 |
|---|---|
| `daohang` | `realm` → 查 `tuning.attributes.daohangByRealm`：感气 1、炼气 1–3 层 2、炼气 4–6 层 3、炼气 7–9 层 4、筑基 5（更高境界由境界表扩展） |
| `lingli` | `spiritualPower.value ÷ spiritualPowerCap` 的比值档位，再按 `spiritualPowerControl` 调整：`disordered` 降 1 级、`fluctuating` 不变、`steady` 升 1 级（上限 5） |
| `shenshi` | `daohang` 基准，按 `soulLoad.value` 降级；有「道心受损」类 flag 再降 1 |
| `shenfa` | 由 `constitution` 基准，按 `injuries` 最高 severity 降级（`restricting` −1 / `severe` −2 / `critical` −3），再按 `fatigue` 档位 −1 |
| `wuxing` | `understanding` 条目数量与深度（`熟练` 以上计权重），叠加 `spiritualRoot` 修正 |
| `xinzhi` | 由心境类 flag 推导（如「道心坚定」+1、「心神不宁」−1），无 flag 时默认 **3** |

**推导结果必须可解释**：任何一次判定卡上，属性值都要能说明它从哪些状态来。这是 `26` §8 的审计要求。

### 2.4 大境界差距不进属性（Q-C 的关键）

**境界差距不用属性表达，用条件门控。** 理由：把「筑基 vs 炼气」压成一个 ±2 的修正，会让玩家以为「多准备一下就能赢」——那违反 `26` §1.5「跨境能力差必须真实存在」。

**正确做法**：写进 `requires`。

```jsonc
// 炼气期面对筑基修士：正面强攻这个选项直接不出现
{
  "id": "fight-head-on",
  "label": "正面强攻",
  "requires": { "any": [
    { "gte": ["attrs.daohang", 4] },
    { "flag": "opened.talisman.trump-card" }
  ]}
}
```

`12` §7 允许低境界角色通过「伏击、逃跑、谈判、借力、破坏目标」改变局面——**那些走别的选项**，而不是靠修正值抹平差距。

---

## 3. DC 难度基线表

### 3.1 六档

| 档位 | DC | 语义 | 典型情境 |
|---|---:|---|---|
| 轻而易举 | **5** | 稍有经验即可 | 日常操作、熟练技艺的常规运用 |
| 简单 | **7** | 正常水平可完成 | 有轻微阻力的操作 |
| 常规 | **9** | 需真正能力 | 有压力的对抗 |
| 困难 | **11** | 需专长或有利条件 | 越级尝试 |
| 险峻 | **13** | 需专长 **且** 有利条件 | 明显不利局面 |
| 近乎不可能 | **15** | 卓绝 + 修正拉满 | 极罕见 |

### 3.2 修正项（每项 ±1，**总上限 ±3**）

| 方向 | 来源 |
|---|---|
| **+1** | 充分准备 / 可靠情报 / 有利地形 / 先手 / 人数优势 |
| **−1** | 带伤 / 心神不宁 / 环境恶劣 / 被围 |

**超出此范围的因素一律不进修正，改走条件门控**（见 §2.4）。

### 3.3 大成功 / 大失败（Q-E 正式化）

- **自然 10 = 大成功**：视为通过，且可触发该选项的 `onCriticalSuccess`（若未定义，则按 `onSuccess` 并附一条额外收益）
- **自然 1 = 大失败**：**默认不产生重伤或死亡**

**大失败的默认代价**（按优先级择一，写入 `onCriticalFail`）：

1. 额外时间消耗
2. 额外资源消耗
3. 状态恶化（疲劳 / 灵力紊乱 / 伤势加重一档）
4. 暴露（引来注意、关系恶化、留下痕迹）

**重伤或死亡的唯一允许路径**：该选项**在数据中显式声明风险等级**，且**场景已提前提示该风险**。

```jsonc
"check": {
  "stat": "attrs.shenfa", "dice": "1d10", "dc": 13,
  "hazard": {
    "declared": true,           // 声明本选项有实质危险
    "foreshadowed": true,       // 场景文本已让角色察觉风险（硬性要求）
    "criticalFailSeverity": "severe",   // minor | restricting | severe | critical | lethal
    "criticalFailEffect": { "op": "injury.add", "id": "injury.fall-fracture", "severity": "severe" }
  }
}
```

**校验器硬规则**：

- `hazard.declared: true` **而** `hazard.foreshadowed: false` → **校验失败**。不允许在玩家毫无预警的情况下判重伤或死亡
- `criticalFailSeverity: "lethal"` → 校验时输出 **WARNING**，并在报告中列出，供 YY 逐个复核
- `26` §4「死亡不是常规失败结果」→ **普通检定不得携带 `hazard` 字段**

### 3.4 失败前进（fail-forward，Q2 已定）

- **每个带 `check` 的选项，其 `onFail` 必须给出可继续的 `next`**，或明确写出「失败但不推进」的理由
- 校验规则：`onFail.next` 为空 **且** `onFail.blockReason` 为空 → **校验失败**
- 失败不得写成「卡死」；`12` §3 允许的失败结果是：停滞 / 消耗资源 / 短期紊乱 / 受伤 / 留下长期隐患

### 3.5 什么时候不掷骰

- `check` 缺失 → 该选项**不掷骰**，直接按 `effects` 结算。**日常行动不该每次都掷骰**（`12` 开头：「不为每个动作掷骰」）
- 条件明显不满足 → 由 `requires` 门控，**不给「掷一下试试」的机会**

---

## 4. Event Node Schema 定稿

### 4.1 节点字段全表

```jsonc
{
  "id": "main.ch01.01",              // 全局唯一。命名：main.ch<NN>.<NN> / side.ch<NN>.<NN> / ambient.<regionSlug>.<NN>
  "kind": "main",                    // main | side | ambient
  "title": "章节/节点显示标题",
  "chapter": 1,
  "region": "region.<slug>",         // 必须存在于 world.json
  "location": "loc.<slug>",          // 必须存在于 world.json
  "once": true,                      // 触发后永久不再触发
  "cooldownDays": 0,
  "weight": null,                    // 仅 ambient/side 使用，用于加权随机
  "priority": 0,                     // 同 kind 内的次级排序键（仅用于确定性复现，不用于加权）

  "activation": { /* Condition */ },      // WHEN：何时可被触发
  "invalidation": { /* Condition */ },    // 可选：满足后永久失效（不产出，只作废）

  "scene": {
    "textKey": "main.ch01.01.scene",   // 指向 data/text/*，不内联长文本
    "speaker": "npc.<slug>"            // 可空
  },

  "choices": [
    {
      "id": "a",
      "labelKey": "main.ch01.01.choice.a",   // 或直接 "label": "……"
      "requires": { /* Condition */ },       // 不满足则置灰并显示原因
      "check": { /* 见 4.3 */ },              // 可空：空则不掷骰
      "onSuccess": { "effects": [], "next": "main.ch01.02a" },
      "onFail":    { "effects": [], "next": "main.ch01.02b" },
      "onCriticalSuccess": { "effects": [], "next": null },
      "onCriticalFail":    { "effects": [], "next": null }
    }
  ],

  "defaultOutcome": { "effects": [], "next": null }   // 【必填】所有 choice 都被 requires 关掉时的兜底，防空转/软锁
}
```

**三条硬规则**：

1. **`defaultOutcome` 必填**。没有任何可用选项的事件必须有一个明确的出口。
2. **文本不内联**。`scene.textKey` / `choice.labelKey` 指向 `data/text/*.json`，长文本不进事件文件。
3. **`location` / `region` / `factionId` 一律为机器 id**，且必须存在于 `world.json`。

### 4.2 Condition DSL（白名单，禁止 `eval`）

**逻辑**：`all` / `any` / `not`

**比较**：`eq` / `ne` / `gt` / `gte` / `lt` / `lte`（`[path, value]`）

**专用操作符**：

| 操作符 | 形式 | 含义 |
|---|---|---|
| `flag` | `[flagId]` 或 `{flag: id, value: bool}` | flag 判定 |
| `empty` | `[path]` | 数组为空（用于 `injuries`） |
| `hasItem` / `countItem` | `[itemId, n]` | 背包判定（按 `itemId`） |
| `relationAxis` | `{npc: id, axis: "trust", gte: "trusting"}` | 关系单轴判定 |
| `locationIs` / `regionIs` | `[id]` | 位置判定 |
| `day` / `timeBetween` | `[min, max]` | 时间判定（分钟） |
| `eventFired` / `eventNotFired` | `[eventId]` | 事件历史 |
| `taskActive` | `[taskId]` | 任务判定 |
| `realmStability` | `[value]` | 境界稳固状态 |
| `techniqueStage` | `[techniqueId, stage]` | 技艺阶段（含比较） |
| `understandingLevel` | `[topicId, level]` | 理解阶段 |
| `attrs` | `{attr, gte}` | 检定属性（见 §2） |

**规则**：
- **路径求值失败 = 报错**，不是 `false`（`04` 报告 O4；静默失败是最危险的 bug 类型）
- **未识别操作符在加载阶段即报错**
- 所有条件必须**可静态审计**：校验器能列出每个 flag/事件/物品被引用与被设置的位置

### 4.3 Effect DSL（命名操作符）

| 操作符 | 字段 | 说明 |
|---|---|---|
| `stat.add` / `stat.set` | `stat`, `delta` / `value`, `reason` | 数值增减；受 §1.3 钳制规则约束 |
| `currency.add` | `unit`, `amount`, `reason` | **越界即报错**，不钳制 |
| `item.add` / `item.remove` | `itemId`, `quantity`, `reason` | **entries 必须按 `itemId`**；越界即报错 |
| `relation.set` | `npcId`, `axis`, `value`, `cause` | 单轴设置（`affinity`/`trust`/`respect`/`fear`） |
| `obligation.add` / `obligation.settle` | `npcId`, `direction`, `what` | 人情债务（列表，不折算点数） |
| `interest.add` | `npcId`, `kind`, `description` | 利益依赖 |
| `flag.set` | `flag`, `value` | |
| `technique.gain` | `techniqueId`, `stage`, `evidence` | 技艺阶段提升 |
| `understanding.set` | `topicId`, `level`, `evidence` | 理解阶段 |
| `injury.add` / `injury.heal` | 见 §1.2 八字段 | |
| `soul.load` | `delta`, `reason` | 神识负荷 |
| `time.advance` | `minutes` | |
| `location.move` | `locationId` | 必须存在于 `world.json` |
| `event.fire` / `event.invalidate` | `eventId` | 事件调度 |

**每次 effect 执行后立即写 `ledger`**（`before` / `change` / `after` / `reason` / 是否钳制）。

### 4.4 校验规则（全部为硬性）

1. Schema 字段与类型校验；未知字段报错
2. `id` 全局唯一；命名规范校验
3. **孤儿引用**：`next` / `location` / `region` / `factionId` / `itemId` / `npcId` / `textKey` 全部必须存在
4. **不可达节点**检测
5. **软锁检测**：每个节点要么有至少一个 `requires` 恒真的选项，要么有 `defaultOutcome`
6. **同一 tick 多个 `main` 命中 = 校验错误**（不是运行时消解，`07` 报告 O2）
7. **`hazard.foreshadowed` 校验**（§3.3）
8. **fail-forward 校验**（§3.4）
9. **条目级 schema 校验**：`inventory[]` / `currencyBalances[]` / `relationships[]` 的元素必填字段与类型（`07` 报告 N6）
10. **悬空 flag 警告**：被条件引用但无任何 effect 设置的 flag

### 4.5 完整示例节点（走一遍全部机制）

```jsonc
{
  "id": "main.ch01.03",
  "kind": "main",
  "title": "断崖前的选择",
  "chapter": 1,
  "region": "region.<slug>",
  "location": "loc.<slug>",
  "once": true,
  "activation": { "all": [
    { "flag": "ch01.met-guide" },
    { "gte": ["attrs.daohang", 2] },
    { "empty": ["character.injuries"] }
  ]},
  "scene": { "textKey": "main.ch01.03.scene" },
  "choices": [
    {
      "id": "climb",
      "labelKey": "main.ch01.03.choice.climb",
      "requires": { "gte": ["character.spiritualPower.value", 4] },
      "check": {
        "stat": "attrs.shenfa", "dice": "1d10", "dc": 11,
        "modifiers": [
          { "source": "prepared.rope", "value": 1 },
          { "source": "fatigue.tired", "value": -1 }
        ],
        "hazard": { "declared": true, "foreshadowed": true,
                    "criticalFailSeverity": "severe",
                    "criticalFailEffect": { "op": "injury.add", "id": "injury.fall", "severity": "severe" } }
      },
      "onSuccess": { "effects": [
        { "op": "understanding.set", "topicId": "cliff.clue", "level": "初识", "evidence": "亲眼见到崖下刻痕" },
        { "op": "time.advance", "minutes": 120 }
      ], "next": "main.ch01.04" },
      "onFail": { "effects": [
        { "op": "stat.add", "stat": "character.fatigue.value", "delta": 20, "reason": "攀爬失败" }
      ], "next": "main.ch01.03b" }
    },
    {
      "id": "detour",
      "label": "绕路而行",
      "requires": null,
      "onSuccess": { "effects": [
        { "op": "time.advance", "minutes": 360 },
        { "op": "flag.set", "flag": "ch01.arrived-late", "value": true }
      ], "next": "main.ch01.04" }
    }
  ],
  "defaultOutcome": { "effects": [
    { "op": "time.advance", "minutes": 240 },
    { "op": "flag.set", "flag": "ch01.missed-cliff", "value": true }
  ], "next": "main.ch01.04" }
}
```

注意这个例子同时体现了：条件清单、属性检定、修正项上限、**带 `foreshadowed` 的危险判定**、fail-forward、`defaultOutcome` 兜底。

---

## 5. 交给 Antigravity 的实现事项

> 分工：小肥出规范与验收，Antigravity 实现。以下每条带验收方式。
> **其中 5.1–5.3 是《07 报告》三格残余的收口，请一并处理。**

### 5.1 修为上限改读数据（R1 最后一格）

**现状**：`app.js` 读 `TUNING.fatigue.max` ✅，但**不读 `TUNING.cultivation.max`**（已实查），`Math.min(100, ...)` 仍有 4 处（L165 / L736 / L810 / L836）。

**要求**：修为上限一律读 `TUNING.cultivation.max`；进度条宽度按同一上限换算。

**验收**：把 `tuning.cultivation.max` 改成 200，`app.js` 零行修改，钳制点随之变为 200。

### 5.2 inventory 条目级校验（N6 的另一半）

**现状**：`validate-schema.js` 已校验 `currencyBalances`（含禁止 `currency` 字段）与 `relationships.affinity` ✅，但**完全没有** `inventory` 条目校验（既无 `itemId` 也无 `quantity`）。

**要求**：新增 `inventory[]` 条目校验——`itemId`（须存在于 `items.json`）、`name`、`quantity`（非负整数）、`unit` 必填；并纳入**运行时存档校验**。

**验收**：构造一条 `{ name: "X", count: 1 }`（旧形状）的背包条目，校验器精准报错到 `inventory[0].itemId`。

### 5.3 界面去百分比（Q-A 硬验收）

**现状**：`app.js` L124 `progressNum + "%"`、L751/L814/L848 结果卡、narration 里的 `{gain}%` —— **界面仍在向玩家展示精确百分比**。

**要求**：
1. 角色面板改为显示 `realmStability` + `progressBand` 的文字（例：**炼气三层 · 积累中（明显）**）
2. 结果卡不再显示 `+{gain}%`，改为文字描述（例：**修为：有所积累**）
3. **硬验收：全站检索，界面与叙事中不得出现 `%` 与具体进度数字**（`L1047` 提示词与 JSON 导出属机器接口，可豁免，但需在文档中显式说明）

### 5.4 经济校准（Q-D）

**要求**：按 §1.5 调整 `item.qi-pill` 售价与杂事报酬，并做一次校准——**用一个角色跑 3 个游戏日**，记录：总营收、总支出、灵石余额、能否负担一次修炼室使用。数据写入报告，供 YY 复核。

**此项不阻塞 M1**，但需在 M1 结束前完成。

### 5.5 事件管线的校验项（M1）

按 §4.4 的 10 条实现，其中 6 / 7 / 8 / 9 必须写进 `validate-schema.js` 并在 CI 中阻断。

---

## 6. 待校准与未决

| # | 事项 | 说明 |
|---|---|---|
| 1 | `tuning.realms` 境界表 | 需新增：各境界的 `spiritualPowerCap`、突破条件清单、`daohangByRealm`。**数值由校准确定，不由我拍脑袋** |
| 2 | 物价与报酬具体值 | 见 §5.4 校准程序 |
| 3 | `techniqueMastery` / `understanding` 的条目清单 | 依赖 YY 的剧本与功法设定，编剧侧交付 |
| 4 | 死亡判定的 `lethal` 用例 | 需 YY 逐个复核（`26` §4 明确要求） |
| 5 | 玩家可见的「风险提示」文案规范 | §3.3 要求「已提前提示」——**提示怎么写、写多明显**，属编剧侧规范，我下一份给 |

---

*本文件为四份规范的合并定稿。凡与《交接报告 v1》§6.1 冲突之处，以本文件为准；凡与 `xiuxian_working_v1.5` 冲突之处，以设定集为准，并须回报 YY 裁定。*
