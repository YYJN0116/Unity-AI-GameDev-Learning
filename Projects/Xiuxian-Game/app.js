(() => {
  "use strict";

  const STORAGE_KEY = "xiuxian-world-journal-v0.1";
  const REALM_NAMES = ["感气", "炼气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"];
  const STAGE_NAMES = ["初期", "中期", "后期", "圆满"];
  const ACTIONS = [
    ["cultivate", "修炼"], ["explore", "探索"], ["task", "任务"],
    ["trade", "商贸 / 交易"], ["social", "结交 / 交谈"],
    ["combat", "试炼 / 战斗"], ["breakthrough", "突破"], ["rest", "休息 / 闭关"]
  ];
  const WORLD_DATABASE = {
  "schemaVersion": "0.1",
  "catalogStatus": "candidate_catalog",
  "description": "条目源自 game-design.md 的建议清单，都是候选，不自动成为本局正史。",
  "selectionPolicy": {
    "randomEligibleStatuses": [
      "candidate",
      "active"
    ],
    "candidateRequiresPlayerConfirmation": true,
    "doNotSelectDeprecated": true,
    "selectOnlyWithinRequestedType": true
  },
  "continents": [
    {
      "id": "chenxi",
      "name": "晨曦大陆",
      "description": "修仙世界的主要舞台"
    }
  ],
  "regions": [
    {
      "id": "xuanhai-wasteland",
      "name": "玄海荒地",
      "type": "wilderness_region",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "notes": "原文将其列入主要势力建议，但名称更像区域；正式定位待确认。"
    },
    {
      "id": "old-dynasty-remains",
      "name": "旧朝残迹",
      "type": "historical_region_or_ruins",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "notes": "原文将其列入主要势力建议；具体是区域、遗迹还是势力待确认。"
    }
  ],
  "locations": [
    {
      "id": "back-mountain-cave",
      "name": "后山洞府",
      "type": "cultivation_site",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": "建议作为修炼地点；安全程度和可用条件须按本局设定。"
    },
    {
      "id": "mountain-gate",
      "name": "山门",
      "type": "sect_site",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": "可用于宗门事务、结识门人和获取消息。"
    },
    {
      "id": "market",
      "name": "坊市",
      "type": "market",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": "可用于交易、购买资源和获取外部消息；具体价格待本局校准。"
    },
    {
      "id": "cold-spring-valley",
      "name": "冷泉谷",
      "type": "valley",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": null
    },
    {
      "id": "forest-secret-realm",
      "name": "密林秘境",
      "type": "secret_realm",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": "可用于探索；危险、收益、入口和路程须按本局设定。"
    },
    {
      "id": "forbidden-frontier",
      "name": "禁地前沿",
      "type": "frontier",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §7",
      "candidateDescription": "候选事件地点；具体秘密、风险和用途待本局设定。"
    }
  ],
  "factions": [
    {
      "id": "xuanfeng-sect",
      "name": "玄风宗",
      "type": "sect",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "values": null,
      "influence": null,
      "resources": null,
      "keyCharacters": []
    },
    {
      "id": "lieyan-valley",
      "name": "烈焰谷",
      "type": "sect",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "values": null,
      "influence": null,
      "resources": null,
      "keyCharacters": []
    },
    {
      "id": "yueyin-gate",
      "name": "月隐门",
      "type": "sect",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "values": null,
      "influence": null,
      "resources": null,
      "keyCharacters": []
    },
    {
      "id": "mortal-trade-association",
      "name": "人间商会",
      "type": "merchant_association",
      "status": "candidate",
      "randomEligible": true,
      "requiresPlayerConfirmation": true,
      "source": "game-design.md §4.2",
      "values": null,
      "influence": null,
      "resources": null,
      "keyCharacters": []
    }
  ]
};
  const CHARACTER_PATCH_FIELDS = new Set([
    "name", "age", "background", "identity", "spiritualRoot", "constitution",
    "realm", "cultivationProgress", "spiritualPower", "fatigue", "injuries",
    "inventory", "currencyBalances", "relationships", "reputation", "debts",
    "goals", "activeTasks"
  ]);
  const WORLD_PATCH_FIELDS = new Set(["currentLocationId", "events"]);
  const GAME_WORLD_PATCH_FIELDS = new Set(["continent", "location", "faction"]);
  const el = (id) => document.getElementById(id);
  const requiredIds = ["character-card", "action-buttons", "story-log", "ai-prompt",
    "copy-prompt", "save-button", "load-button", "reset-button", "current-date", "status-title"];

  const missingIds = requiredIds.filter((id) => !el(id));
  if (missingIds.length) {
    console.error("修仙原型缺少必要页面元素：", missingIds);
    return;
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const makeInitialState = () => ({
    schemaVersion: "0.1",
    sessionId: "session-" + Date.now().toString(36),
    updatedAt: { inGameDate: null, timeOfDayMinutes: null },
    character: {
      id: "", name: "", age: null, background: "", identity: "",
      spiritualRoot: "", constitution: "",
      realm: { name: "", level: null, stage: null },
      cultivationProgress: null,
      spiritualPower: { value: null, unit: null, controlState: "" },
      fatigue: { value: null, scaleId: null, description: "" },
      injuries: [], inventory: [], currencyBalances: [], relationships: [],
      reputation: null, debts: [], goals: [], activeTasks: []
    },
    gameWorld: { continent: "", location: "", faction: "" },
    world: { currentLocationId: "", events: [] },
    ledger: []
  });

  let state = makeInitialState();
  let pendingAction = null;
  let pendingResult = null;
  let pendingWorldSetup = null;

  function setMessage(message, isError) {
    let node = el("app-message");
    if (!node) {
      node = document.createElement("p");
      node.id = "app-message";
      node.setAttribute("role", "status");
      const panel = document.querySelector(".save-panel");
      if (panel) panel.appendChild(node);
    }
    node.textContent = message || "";
    node.style.color = isError ? "#f29c9c" : "#8ce4a3";
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === "") return "未设定";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function formatRealm(realm) {
    if (!realm || !realm.name) return "未设定";
    if (realm.name === "炼气" && Number.isInteger(realm.level)) return "炼气" + realm.level + "层";
    return realm.name + (realm.stage || "");
  }

  function formatClock(minutes) {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) return "时间未设定";
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" +
      String(minutes % 60).padStart(2, "0");
  }

  function renderState() {
    const character = state.character;
    const currency = (character.currencyBalances || []).map((item) =>
      (item.unit || "未命名货币") + " " + formatValue(item.amount)
    ).join("、") || "未设定";
    const inventory = (character.inventory || []).map((item) =>
      (item.name || item.itemId || "未命名物品") + " ×" + formatValue(item.quantity) +
      (item.unit ? " " + item.unit : "")
    ).join("、") || "无";
    const relationships = (character.relationships || []).map((item) =>
      (item.npcId || item.name || "NPC") + "：" + formatValue(item.status || item.description || item)
    ).join("；") || "无";
    const injuries = (character.injuries || []).map((item) =>
      typeof item === "string" ? item : (item.description || JSON.stringify(item))
    ).join("；") || "无";
    const progress = character.cultivationProgress === null
      ? "未设定" : formatValue(character.cultivationProgress);
    const power = character.spiritualPower
      ? [character.spiritualPower.value, character.spiritualPower.unit, character.spiritualPower.controlState]
          .filter((value) => value !== null && value !== undefined && value !== "")
          .map(formatValue).join(" / ") || "未设定"
      : "未设定";
    const fatigue = character.fatigue
      ? [character.fatigue.value, character.fatigue.scaleId, character.fatigue.description]
          .filter((value) => value !== null && value !== undefined && value !== "")
          .map(formatValue).join(" / ") || "未设定"
      : "未设定";
    const fields = [
      ["姓名", character.name], ["年龄", character.age],
      ["身份 / 背景", [character.identity, character.background].filter(Boolean).join(" / ")],
      ["灵根", character.spiritualRoot], ["体质", character.constitution],
      ["境界", formatRealm(character.realm)], ["修为进度", progress],
      ["灵力", power], ["疲劳", fatigue], ["伤势", injuries],
      ["货币", currency], ["物品", inventory], ["关系", relationships],
      ["名声", character.reputation],
      ["大陆", state.gameWorld.continent], ["地点", state.gameWorld.location],
      ["势力", state.gameWorld.faction], ["当前地点 ID", state.world.currentLocationId],
      ["目标", (character.goals || []).join("；")],
      ["进行中事项", (character.activeTasks || []).join("；")]
    ];
    const card = el("character-card");
    card.replaceChildren();
    const grid = document.createElement("div");
    grid.className = "stat-grid";
    fields.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "stat-item";
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = label;
      const val = document.createElement("span");
      val.className = "value";
      val.textContent = formatValue(value);
      item.append(key, val);
      grid.appendChild(item);
    });
    card.appendChild(grid);

    const date = state.updatedAt.inGameDate;
    el("current-date").textContent = date
      ? date + " " + formatClock(state.updatedAt.timeOfDayMinutes)
      : "游戏日期待设定";
    const last = state.ledger[state.ledger.length - 1];
    el("status-title").textContent = last && last.action
      ? "最近行动：" + last.action.label : "等待行动";
    renderLog();
    syncDateControls();
  }

  function renderLog() {
    const log = el("story-log");
    log.replaceChildren();
    (state.ledger || []).slice().reverse().forEach((entry) => {
      const article = document.createElement("article");
      article.className = "log-entry";
      const heading = document.createElement("strong");
      const at = entry.at || {};
      heading.textContent = (at.inGameDate || "日期未设定") + " " +
        formatClock(at.timeOfDayMinutes) + " · " +
        ((entry.action && entry.action.label) || "记录");
      const body = document.createElement("div");
      body.textContent = entry.narration || entry.note || "";
      article.append(heading, body);
      const addDetail = (label, value) => {
        if (value === null || value === undefined || value === "") return;
        const detail = document.createElement("div");
        detail.textContent = label + "：" + (Array.isArray(value)
          ? value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("；")
          : String(value));
        article.appendChild(detail);
      };
      addDetail("观察", entry.observations);
      addDetail("判定依据", entry.decisionBasis);
      addDetail("关系 / 事件", entry.relationshipEventChanges);
      addDetail("可选行动", entry.nextActions);
      addDetail("剧情钩子", entry.storyHook);
      if (entry.actionOutcome) {
        const outcome = document.createElement("div");
        outcome.textContent = "结果：" + entry.actionOutcome;
        article.appendChild(outcome);
      }
      if (entry.resourceChanges && entry.resourceChanges.length) {
        const changes = document.createElement("div");
        changes.textContent = "资源变化：" + entry.resourceChanges.map((item) =>
          item.label || item.reason || JSON.stringify(item)
        ).join("；");
        article.appendChild(changes);
      }
      log.appendChild(article);
    });
    if (!state.ledger.length) {
      const empty = document.createElement("p");
      empty.className = "small-text";
      empty.textContent = "尚无行动记录。";
      log.appendChild(empty);
    }
  }

  function getRandomEligible(items) {
    const allowedStatuses = WORLD_DATABASE.selectionPolicy.randomEligibleStatuses;
    const eligible = items.filter((item) =>
      item.randomEligible === true && allowedStatuses.includes(item.status) &&
      item.status !== "deprecated"
    );
    if (!eligible.length) throw new Error("世界库中没有可随机抽取的合格条目。");
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  function makeWorldSetupProposal() {
    if (!Array.isArray(WORLD_DATABASE.continents) || !WORLD_DATABASE.continents.length) {
      throw new Error("世界库尚无大陆条目。");
    }
    return {
      continent: WORLD_DATABASE.continents[0],
      location: getRandomEligible(WORLD_DATABASE.locations || []),
      faction: getRandomEligible(WORLD_DATABASE.factions || [])
    };
  }

  function renderWorldSetupProposal() {
    const proposal = el("world-setup-proposal");
    const summary = el("world-setup-summary");
    if (!proposal || !summary) return;
    proposal.hidden = !pendingWorldSetup;
    if (!pendingWorldSetup) return;
    summary.textContent = "大陆：" + pendingWorldSetup.continent.name +
      "；地点：" + pendingWorldSetup.location.name +
      "；势力：" + pendingWorldSetup.faction.name +
      (WORLD_DATABASE.selectionPolicy.candidateRequiresPlayerConfirmation
        ? "（候选设定，等待玩家确认）" : "");
  }

  function addNewGameControls() {
    const panel = document.querySelector(".save-panel");
    if (!panel || el("new-game-button")) return;
    const group = document.createElement("section");
    group.className = "new-game-controls";
    const button = document.createElement("button");
    button.type = "button";
    button.id = "new-game-button";
    button.textContent = "新游戏：随机世界";
    button.addEventListener("click", () => {
      try {
        pendingWorldSetup = makeWorldSetupProposal();
        renderWorldSetupProposal();
        setMessage("已抽取世界候选；确认前不会覆盖当前存档。", false);
      } catch (error) {
        setMessage("无法生成新游戏：" + error.message, true);
      }
    });
    const proposal = document.createElement("div");
    proposal.id = "world-setup-proposal";
    proposal.hidden = true;
    const summary = document.createElement("p");
    summary.id = "world-setup-summary";
    const rerollButton = document.createElement("button");
    rerollButton.type = "button";
    rerollButton.textContent = "重新抽取";
    rerollButton.addEventListener("click", () => {
      try {
        pendingWorldSetup = makeWorldSetupProposal();
        renderWorldSetupProposal();
      } catch (error) {
        setMessage("无法重新抽取：" + error.message, true);
      }
    });
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = "确认并开始新游戏";
    confirmButton.addEventListener("click", () => {
      if (!pendingWorldSetup) return;
      if (!window.confirm("开始新游戏会替换当前浏览器中的本局存档并重置角色。确认继续吗？")) return;
      const previousState = state;
      const nextState = makeInitialState();
      nextState.gameWorld = {
        continent: pendingWorldSetup.continent.name,
        location: pendingWorldSetup.location.name,
        faction: pendingWorldSetup.faction.name
      };
      nextState.world.currentLocationId = pendingWorldSetup.location.id;
      state = nextState;
      if (!saveState(false)) {
        state = previousState;
        return;
      }
      pendingWorldSetup = null;
      pendingAction = null;
      pendingResult = null;
      renderState();
      renderWorldSetupProposal();
      setMessage("新游戏已开始，世界设定已写入存档。", false);
    });
    proposal.append(summary, rerollButton, confirmButton);
    group.append(button, proposal);
    panel.querySelector("h2").insertAdjacentElement("afterend", group);
  }

  function addDateControls() {
    const panel = document.querySelector(".save-panel");
    if (!panel || el("session-date")) return;
    const group = document.createElement("div");
    group.className = "session-date-controls";
    const label = document.createElement("label");
    label.htmlFor = "session-date";
    label.textContent = "游戏起始日期";
    const date = document.createElement("input");
    date.type = "date";
    date.id = "session-date";
    date.style.width = "100%";
    const timeLabel = document.createElement("label");
    timeLabel.htmlFor = "session-time";
    timeLabel.textContent = "当日已过分钟（0–1439）";
    const time = document.createElement("input");
    time.type = "number";
    time.id = "session-time";
    time.min = "0";
    time.max = "1439";
    time.value = "0";
    time.style.width = "100%";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "设定游戏日期";
    button.addEventListener("click", () => {
      const dateValue = date.value;
      const minuteValue = Number(time.value);
      if (!dateValue || !Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 1439) {
        setMessage("请填写有效公历日期和 0–1439 的分钟数。", true);
        return;
      }
      if (state.updatedAt.inGameDate && !window.confirm("这会更改当前游戏时钟，继续吗？")) return;
      state.updatedAt.inGameDate = dateValue;
      state.updatedAt.timeOfDayMinutes = minuteValue;
      saveState(false);
      renderState();
      setMessage("游戏日期已设定。", false);
    });
    group.append(label, date, timeLabel, time, button);
    panel.querySelector("h2").insertAdjacentElement("afterend", group);
  }

  function syncDateControls() {
    const date = el("session-date");
    const time = el("session-time");
    if (date) date.value = state.updatedAt.inGameDate || "";
    if (time) time.value = Number.isInteger(state.updatedAt.timeOfDayMinutes)
      ? String(state.updatedAt.timeOfDayMinutes) : "0";
  }

  function addImportExportControls() {
    const panel = document.querySelector(".save-panel");
    if (!panel || el("state-json")) return;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "导入 / 导出状态 JSON";
    const textarea = document.createElement("textarea");
    textarea.id = "state-json";
    textarea.rows = 8;
    textarea.style.width = "100%";
    textarea.placeholder = "粘贴符合 v0.1-data-standard.md 的完整存档 JSON";
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.textContent = "导出当前状态";
    exportButton.addEventListener("click", () => {
      textarea.value = JSON.stringify(state, null, 2);
      setMessage("状态 JSON 已生成，可复制保存。", false);
    });
    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.textContent = "导入状态 JSON";
    importButton.addEventListener("click", () => {
      try {
        const imported = JSON.parse(textarea.value);
        normalizeState(imported);
        validateState(imported);
        if (!window.confirm("导入内容将替换当前状态，继续吗？")) return;
        state = imported;
        saveState(false);
        renderState();
        setMessage("状态 JSON 已导入。", false);
      } catch (error) {
        setMessage("导入失败：" + error.message, true);
      }
    });
    details.append(summary, textarea, exportButton, importButton);
    panel.appendChild(details);
  }

  function addAIResponseControls() {
    const panel = document.querySelector(".ai-panel");
    if (!panel || el("ai-response")) return;
    const label = document.createElement("label");
    label.htmlFor = "ai-response";
    label.textContent = "粘贴 AI 返回的 JSON";
    const response = document.createElement("textarea");
    response.id = "ai-response";
    response.rows = 12;
    response.style.width = "100%";
    response.placeholder = "粘贴 ai-prompt-template.md 要求的纯 JSON";
    const parseButton = document.createElement("button");
    parseButton.type = "button";
    parseButton.textContent = "解析并预览";
    parseButton.addEventListener("click", parseResponse);
    const preview = document.createElement("pre");
    preview.id = "ai-preview";
    preview.style.whiteSpace = "pre-wrap";
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.id = "apply-response";
    applyButton.textContent = "确认并应用状态更新";
    applyButton.disabled = true;
    applyButton.addEventListener("click", applyResponse);
    panel.append(label, response, parseButton, preview, applyButton);
  }

  function renderActions() {
    const container = el("action-buttons");
    container.replaceChildren();
    const list = document.createElement("div");
    list.className = "action-list";
    ACTIONS.forEach(([id, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "action-btn";
      button.textContent = label;
      button.addEventListener("click", () => selectAction(id, label));
      list.appendChild(button);
    });
    const form = document.createElement("div");
    form.id = "action-entry";
    form.style.display = "grid";
    form.style.gap = "8px";
    const title = document.createElement("strong");
    title.id = "selected-action";
    title.textContent = "选择行动后，在此输入具体做法";
    const input = document.createElement("textarea");
    input.id = "player-choice";
    input.rows = 4;
    input.style.width = "100%";
    input.placeholder = "例如：在坊市询问最近的灵草收购价。";
    const promptButton = document.createElement("button");
    promptButton.type = "button";
    promptButton.className = "action-btn primary";
    promptButton.textContent = "生成 AI 主持提示词";
    promptButton.addEventListener("click", buildPrompt);
    form.append(title, input, promptButton);
    container.append(list, form);
  }

  function selectAction(id, label) {
    pendingAction = { id, label, text: "" };
    pendingResult = null;
    el("apply-response").disabled = true;
    el("ai-response").value = "";
    el("ai-preview").textContent = "";
    el("selected-action").textContent = "当前行动：" + label;
    el("player-choice").focus();
    setMessage("写下角色具体要做什么，再生成主持提示词。", false);
  }

  function buildPrompt() {
    if (!pendingAction) {
      setMessage("请先选择行动类型。", true);
      return;
    }
    const choice = el("player-choice").value.trim();
    if (!choice) {
      setMessage("请先输入具体行动。", true);
      return;
    }
    pendingAction.text = choice;
    el("ai-prompt").value = [
      "你是修仙文字 RPG 的 AI 主持人。严格遵循项目规则与当前存档。",
      "只输出 ai-prompt-template.md 定义的 JSON，不要 Markdown 代码围栏或额外文字。",
      "不要改变未受行动影响的字段；不确定的数值保持原值或 null。",
      "timeCostMinutes 必须为非负整数。浏览器会据此推进日期；不要在 statePatch 中修改 updatedAt、sessionId 或 ledger。",
      "若规则、日期或数据不足以结算，请在叙事中说明并将结果标为 pending，不要猜测。",
      "输出必须是单一 JSON 对象，结构如下，字段全部必填：",
      '{"schemaVersion":"0.1","result":{"narration":"","observations":[],"actionOutcome":"success","decisionBasis":"","timeCostMinutes":0,"resourceChanges":[],"relationshipEventChanges":[],"nextActions":[],"storyHook":null},"statePatch":{}}',
      "actionOutcome 只能为 success/partial/failure/pending；resourceChanges 每项须含 label、before、change、after、reason。",
      "statePatch 仅能包含 character、world 或 gameWorld；character 只可改标准字段，world 只可改 currentLocationId/events，gameWorld 只可改 continent/location/faction。列表字段给出完整新列表。",
      "pending 时 timeCostMinutes 必须为 0 且 statePatch 必须为 {}。不要修改 updatedAt、sessionId、ledger。",
      "",
      "行动类型：" + pendingAction.label,
      "玩家选择：" + choice,
      "当前存档 JSON：",
      JSON.stringify(state, null, 2)
    ].join("\n");
    el("ai-response").value = "";
    el("ai-preview").textContent = "";
    pendingResult = null;
    el("apply-response").disabled = true;
    setMessage("提示词已生成。复制到 AI 对话，完成后把 JSON 回复粘贴回来。", false);
    el("ai-prompt").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cleanJSON(text) {
    const fence = String.fromCharCode(96).repeat(3);
    const opening = new RegExp("^" + fence + "(?:json)?\\s*", "i");
    const closing = new RegExp("\\s*" + fence + "$");
    return text.trim().replace(opening, "").replace(closing, "");
  }

  function validateRealm(realm) {
    if (!realm || typeof realm !== "object") throw new Error("境界对象无效。");
    if (realm.name === "" && realm.level === null && realm.stage === null) return;
    if (!REALM_NAMES.includes(realm.name)) throw new Error("境界名称不在标准列表中。");
    if (realm.name === "感气") {
      if (realm.level !== null || realm.stage !== null) throw new Error("感气不能填写层级或阶段。");
    } else if (realm.name === "炼气") {
      if (!Number.isInteger(realm.level) || realm.level < 1 || realm.level > 9 || realm.stage !== null) {
        throw new Error("炼气层级必须为 1–9，且 stage 为 null。");
      }
    } else if (realm.level !== null ||
        (realm.stage !== null && !STAGE_NAMES.includes(realm.stage))) {
      throw new Error("筑基及以上境界的 level 必须为 null，阶段须为标准值或 null。");
    }
  }

  function normalizeState(candidate) {
    if (!candidate || typeof candidate !== "object") return;
    if (!candidate.gameWorld || typeof candidate.gameWorld !== "object") {
      candidate.gameWorld = { continent: "", location: "", faction: "" };
    } else {
      candidate.gameWorld.continent = typeof candidate.gameWorld.continent === "string" ? candidate.gameWorld.continent : "";
      candidate.gameWorld.location = typeof candidate.gameWorld.location === "string" ? candidate.gameWorld.location : "";
      candidate.gameWorld.faction = typeof candidate.gameWorld.faction === "string" ? candidate.gameWorld.faction : "";
    }
    if (!candidate.gameWorld.location && candidate.world && candidate.world.currentLocationId) {
      const match = (WORLD_DATABASE.locations || []).find((item) => item.id === candidate.world.currentLocationId);
      if (match) candidate.gameWorld.location = match.name;
    }
  }

  function validateState(candidate) {
    if (!candidate || candidate.schemaVersion !== "0.1" ||
        !candidate.character || !candidate.world || !candidate.gameWorld || !candidate.updatedAt ||
        !Array.isArray(candidate.ledger)) {
      throw new Error("不是完整的 v0.1 存档。");
    }
    ["continent", "location", "faction"].forEach((key) => {
      if (typeof candidate.gameWorld[key] !== "string") {
        throw new Error("gameWorld." + key + " 必须为字符串。");
      }
    });
    validateRealm(candidate.character.realm);
    ["inventory", "currencyBalances", "relationships", "injuries", "debts", "goals", "activeTasks"]
      .forEach((key) => {
        if (!Array.isArray(candidate.character[key])) throw new Error("角色字段 " + key + " 必须为数组。");
      });
    const date = candidate.updatedAt.inGameDate;
    const minute = candidate.updatedAt.timeOfDayMinutes;
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("游戏日期须为 YYYY-MM-DD 或 null。");
    }
    if (minute !== null && (!Number.isInteger(minute) || minute < 0 || minute > 1439)) {
      throw new Error("timeOfDayMinutes 须为 0–1439 的整数或 null。");
    }
  }

  function validatePatch(patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("statePatch 必须是对象。");
    Object.keys(patch).forEach((section) => {
      if (section !== "character" && section !== "world" && section !== "gameWorld") throw new Error("statePatch 只能包含 character/world/gameWorld。");
      const values = patch[section];
      if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error(section + " patch 无效。");
      const allowed = section === "character" ? CHARACTER_PATCH_FIELDS
        : section === "gameWorld" ? GAME_WORLD_PATCH_FIELDS : WORLD_PATCH_FIELDS;
      Object.keys(values).forEach((key) => {
        if (!allowed.has(key)) throw new Error("不允许更新字段：" + section + "." + key);
      });
      if (section === "character" && values.realm) validateRealm(values.realm);
      ["injuries", "inventory", "currencyBalances", "relationships", "debts", "goals", "activeTasks"]
        .forEach((key) => {
          if (values[key] !== undefined && !Array.isArray(values[key])) {
            throw new Error(section + "." + key + " 必须为数组。");
          }
        });
      if (section === "gameWorld") {
        Object.keys(values).forEach((key) => {
          if (typeof values[key] !== "string") throw new Error("gameWorld." + key + " 必须为字符串。");
        });
      }
      if (section === "world" && values.events !== undefined && !Array.isArray(values.events)) {
        throw new Error("world.events 必须为数组。");
      }
    });
  }

  function parseResponse() {
    try {
      const parsed = JSON.parse(cleanJSON(el("ai-response").value));
      if (parsed.schemaVersion !== "0.1" || !parsed.result || !parsed.statePatch) {
        throw new Error("缺少 schemaVersion、result 或 statePatch。");
      }
      const result = parsed.result;
      if (typeof result.narration !== "string" ||
          !["success", "partial", "failure", "pending"].includes(result.actionOutcome) ||
          typeof result.decisionBasis !== "string" ||
          !Number.isInteger(result.timeCostMinutes) || result.timeCostMinutes < 0 ||
          !Array.isArray(result.observations) ||
          !Array.isArray(result.resourceChanges) ||
          !Array.isArray(result.relationshipEventChanges) ||
          !Array.isArray(result.nextActions) ||
          !result.observations.every((item) => typeof item === "string") ||
          !result.relationshipEventChanges.every((item) => typeof item === "string") ||
          !result.nextActions.every((item) => typeof item === "string") ||
          !result.resourceChanges.every((item) => item && typeof item === "object" &&
            typeof item.label === "string" && Object.prototype.hasOwnProperty.call(item, "before") &&
            Object.prototype.hasOwnProperty.call(item, "change") && Object.prototype.hasOwnProperty.call(item, "after") &&
            typeof item.reason === "string") ||
          !(typeof result.storyHook === "string" || result.storyHook === null)) {
        throw new Error("result 字段或类型不符合 ai-prompt-template.md。");
      }
      validatePatch(parsed.statePatch);
      if (result.actionOutcome === "pending" &&
          (result.timeCostMinutes !== 0 || Object.keys(parsed.statePatch).length !== 0)) {
        throw new Error("pending 结果不得推进时间或修改状态。");
      }
      if (result.timeCostMinutes > 0 &&
          (!state.updatedAt.inGameDate || !Number.isInteger(state.updatedAt.timeOfDayMinutes))) {
        throw new Error("请先设定游戏日期和当日分钟数，再应用耗时大于 0 的行动。");
      }
      pendingResult = parsed;
      el("ai-preview").textContent = JSON.stringify({
        narration: result.narration,
        observations: result.observations,
        outcome: result.actionOutcome,
        timeCostMinutes: result.timeCostMinutes,
        resourceChanges: result.resourceChanges,
        relationshipEventChanges: result.relationshipEventChanges,
        statePatch: parsed.statePatch
      }, null, 2);
      el("apply-response").disabled = false;
      setMessage("JSON 结构有效。检查预览后，再确认应用状态变化。", false);
    } catch (error) {
      pendingResult = null;
      el("apply-response").disabled = true;
      setMessage("解析失败：" + error.message, true);
    }
  }

  function advanceClock(minutes) {
    if (!minutes) return;
    const start = new Date(state.updatedAt.inGameDate + "T00:00:00Z");
    const total = state.updatedAt.timeOfDayMinutes + minutes;
    start.setUTCDate(start.getUTCDate() + Math.floor(total / 1440));
    state.updatedAt.inGameDate = start.toISOString().slice(0, 10);
    state.updatedAt.timeOfDayMinutes = total % 1440;
  }

  function applyResponse() {
    if (!pendingResult || !pendingAction) {
      setMessage("没有可应用的主持结果。", true);
      return;
    }
    const result = pendingResult.result;
    const patch = pendingResult.statePatch;
    if (!window.confirm("将应用行动结果并推进 " + result.timeCostMinutes +
        " 分钟。请确认资源变化无误，继续吗？")) return;

    const previousState = state;
    state = clone(state);
    if (patch.character) Object.assign(state.character, clone(patch.character));
    if (patch.world) Object.assign(state.world, clone(patch.world));
    if (patch.gameWorld) Object.assign(state.gameWorld, clone(patch.gameWorld));
    advanceClock(result.timeCostMinutes);
    state.ledger.push({
      at: clone(state.updatedAt),
      action: clone(pendingAction),
      actionOutcome: result.actionOutcome,
      narration: result.narration,
      observations: result.observations,
      timeCostMinutes: result.timeCostMinutes,
      resourceChanges: result.resourceChanges,
      relationshipEventChanges: result.relationshipEventChanges,
      nextActions: result.nextActions,
      storyHook: result.storyHook,
      decisionBasis: result.decisionBasis,
      statePatch: clone(patch)
    });
    const saved = saveState(false);
    if (!saved) {
      state = previousState;
      renderState();
      return;
    }
    renderState();
    setMessage("本次状态变化已应用并保存。", false);
    pendingResult = null;
    pendingAction = null;
    el("apply-response").disabled = true;
    el("ai-response").value = "";
  }

  function saveState(showFeedback) {
    try {
      validateState(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (showFeedback) setMessage("进度已保存到此浏览器。", false);
      return true;
    } catch (error) {
      setMessage("保存失败：" + error.message, true);
      return false;
    }
  }

  function loadState(showFeedback) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        if (showFeedback) setMessage("此浏览器没有找到存档。", true);
        return false;
      }
      const candidate = JSON.parse(saved);
      normalizeState(candidate);
      validateState(candidate);
      state = candidate;
      renderState();
      if (showFeedback) setMessage("存档已加载。", false);
      return true;
    } catch (error) {
      if (showFeedback) setMessage("加载失败：" + error.message, true);
      return false;
    }
  }

  function resetState() {
    if (!window.confirm("重置会删除此浏览器中的本局存档，继续吗？")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = makeInitialState();
    pendingWorldSetup = null;
    renderWorldSetupProposal();
    pendingAction = null;
    pendingResult = null;
    el("ai-prompt").value = "";
    if (el("ai-response")) el("ai-response").value = "";
    if (el("ai-preview")) el("ai-preview").textContent = "";
    if (el("apply-response")) el("apply-response").disabled = true;
    renderState();
    setMessage("本局已重置；浏览器存档已删除。", false);
  }

  async function copyPrompt() {
    const prompt = el("ai-prompt").value;
    if (!prompt) {
      setMessage("请先选择行动并生成提示词。", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage("主持提示词已复制。", false);
    } catch (_) {
      el("ai-prompt").focus();
      el("ai-prompt").select();
      const copied = document.execCommand("copy");
      setMessage(copied ? "主持提示词已复制。" : "请手动复制提示词。", !copied);
    }
  }

  addNewGameControls();
  addDateControls();
  addImportExportControls();
  addAIResponseControls();
  renderActions();
  el("save-button").addEventListener("click", () => saveState(true));
  el("load-button").addEventListener("click", () => loadState(true));
  el("reset-button").addEventListener("click", resetState);
  el("copy-prompt").addEventListener("click", copyPrompt);
  if (!loadState(false)) renderState();
})();