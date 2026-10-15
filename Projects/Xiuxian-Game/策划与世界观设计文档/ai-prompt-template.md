# AI 主持输出模板 v0.1

本模板定义网页可解析的单次行动响应。规则依据 `game-design.md`、`resource-tracking.md` 与 `v0.1-data-standard.md`。网页不会自动调用 AI；玩家复制提示词到 ChatGPT 后，将返回 JSON 粘贴回原型，检查预览并确认应用。

## 输出要求

- 每次只输出一个 JSON 对象，不加 Markdown 代码围栏、前后说明、注释或尾逗号。
- 必须包含下方全部字段，字段名和类型不可变；无内容时用空数组或 `null`。
- 只更新确实受本次行动影响的字段。未改变的字段不要重复写入 `statePatch`。
- 不创造标准未定义的数值单位、兑换率、属性上限、境界或行动公式。未知值保留原值或 `null`。
- `timeCostMinutes` 是非负整数。它表示行动实际经过的游戏分钟；网页负责推进公历日期和时刻。不得在 `statePatch` 中写入 `updatedAt`、`sessionId` 或 `ledger`。
- `pending` 表示目前无法安全结算：`timeCostMinutes` 必须为 0，`statePatch` 必须为 `{}`，并在 `decisionBasis` 说明缺少什么。
- 玩家自由行动；`nextActions` 是可选建议，不是限制。没有合适剧情钩子时 `storyHook` 用 `null`。

## 固定 JSON 结构

```json
{
  "schemaVersion": "0.1",
  "result": {
    "narration": "面向玩家的行动结果叙述",
    "observations": ["角色能观察到的信息"],
    "actionOutcome": "success",
    "decisionBasis": "简要说明行动可行性、判定依据或待确认原因",
    "timeCostMinutes": 0,
    "resourceChanges": [
      {
        "label": "变化项目",
        "before": null,
        "change": null,
        "after": null,
        "reason": "变化原因"
      }
    ],
    "relationshipEventChanges": [],
    "nextActions": [],
    "storyHook": null
  },
  "statePatch": {}
}
```

## 字段规则

### result

- `narration`：字符串。只叙述结果及角色视角可知内容；不把传闻、推断或主持端秘密说成事实。
- `observations`：字符串数组；没有新增观察时为 `[]`。
- `actionOutcome`：只能是 `success`、`partial`、`failure` 或 `pending`。
- `decisionBasis`：字符串。说明重要判定依据；确定且无风险的小行动可简短说明。
- `timeCostMinutes`：非负整数。按本局校准口径填写。没有耗时设为 0；估算不确定时先说明并用 `pending` 等待确认，不虚构精确数字。
- `resourceChanges`：数组。每项均包含 `label`、`before`、`change`、`after`、`reason`；数值不适用或未定义时用 `null`，不要用字符串伪装数字。
- `relationshipEventChanges`：字符串数组，记录关系、事件、任务或世界状态的简要变化；没有变化为 `[]`。
- `nextActions`：字符串数组，提供可选行动；允许为空，玩家可提出任何合理行动。
- `storyHook`：字符串或 `null`。不强行添加主线或钩子。

### statePatch

仅包含确实变化的顶层部分，可为空对象：

- `character`：可修改 `name`、`age`、`background`、`identity`、`spiritualRoot`、`constitution`、`realm`、`cultivationProgress`、`spiritualPower`、`fatigue`、`injuries`、`inventory`、`currencyBalances`、`relationships`、`reputation`、`debts`、`goals`、`activeTasks`。
- `world`：可修改 `currentLocationId`、`events`。
- 列表字段是完整替换值，不是增删指令。输出新完整列表，避免网页无法判断如何合并。
- 境界必须遵守 `v0.1-data-standard.md`：感气；炼气 level 1–9；筑基及以上 level 为 `null`，阶段只能是初期/中期/后期/圆满或 `null`。
- 灵力、修为进度、疲劳和伤势若使用数值，必须沿用存档中已确认的单位/量表；不能自行设定。
- `resourceChanges` 与 `statePatch` 必须一致。若不能复算余额、数量或状态，改为 `pending`。
- 网页会校验 JSON 结构并展示差异预览；玩家确认后才应用。AI 不得声称变化已保存，保存由网页完成。

## 最小有效示例

```json
{
  "schemaVersion": "0.1",
  "result": {
    "narration": "你沿街询价，摊主报出当前价格；尚未发生交易。",
    "observations": ["摊位上的灵草按份出售。"],
    "actionOutcome": "success",
    "decisionBasis": "询价不产生交易，也没有已确认的费用。",
    "timeCostMinutes": 10,
    "resourceChanges": [],
    "relationshipEventChanges": [],
    "nextActions": ["继续询价", "购买一份", "离开坊市"],
    "storyHook": null
  },
  "statePatch": {}
}
```

如游戏日期尚未设定且行动需要耗时，网页会阻止应用。先在本局配置中确认日期与时间，再处理该行动结果。
