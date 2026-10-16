(() => {
  "use strict";

  const STORAGE_KEY = "xiuxian-world-journal-v0.2";
  const LEGACY_STORAGE_KEY = "xiuxian-world-journal-v0.1";
  const REALM_NAMES = ["感气", "炼气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"];
  const STAGE_NAMES = ["初期", "中期", "后期", "圆满"];
  const ACTIONS = [
    ["cultivate", "修炼"], ["explore", "探索"], ["task", "任务"],
    ["trade", "商贸 / 交易"], ["social", "结交 / 交谈"],
    ["combat", "试炼 / 战斗"], ["breakthrough", "突破"], ["rest", "休息 / 闭关"]
  ];

  // 从 data-bundle.js 注入的全局数据源（双击 file:// 零 CORS 阻断）
  const DATA = window.XIUXIAN_DATA || {};
  const WORLD_DATABASE = DATA.world || { schemaVersion: "0.2", regions: [], locations: [], factions: [] };
  const TUNING = DATA.tuning || {};

  // 种子化伪随机数发生器 (Mulberry32) - 配合 state.rngSeed 与 state.rngCursor 保证续接精准一致
  function nextRandom() {
    if (!state.rngSeed && state.rngSeed !== 0) state.rngSeed = 123456789;
    state.rngCursor = (state.rngCursor || 0) + 1;
    let s = (state.rngSeed = (state.rngSeed + 0x6D2B79F5) | 0);
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
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
  const makeInitialState = () => {
    if (DATA.stateTemplate) {
      const cloned = clone(DATA.stateTemplate);
      cloned.sessionId = "session-" + Date.now().toString(36);
      return cloned;
    }
    return {
      schemaVersion: "0.2",
      sessionId: "session-" + Date.now().toString(36),
      rngSeed: 123456789,
      rngCursor: 0,
      flags: {},
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
      world: { currentLocationId: "", events: [], offstageLog: [], simulatedThrough: null },
      ledger: []
    };
  };

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
      (item.unit || "灵石") + " " + formatValue(item.amount)
    ).join("、") || "0 块";
    const inventory = character.inventory || [];
    const relationships = character.relationships || [];
    const progressNum = character.cultivationProgress === null ? 0 : Number(character.cultivationProgress) || 0;
    const progress = progressNum + "%";
    const powerVal = character.spiritualPower && character.spiritualPower.value !== null ? character.spiritualPower.value : 0;
    const fatigueVal = character.fatigue && character.fatigue.value !== null ? character.fatigue.value : 0;
    const realmText = formatRealm(character.realm);

    const card = el("character-card");
    card.replaceChildren();

    // 1. 角色头部信息
    const headerCard = document.createElement("div");
    headerCard.className = "char-header-card";
    const avatar = document.createElement("div");
    avatar.className = "char-avatar";
    avatar.textContent = (character.name || "仙")[0];
    const mainInfo = document.createElement("div");
    mainInfo.className = "char-main-info";
    const nameEl = document.createElement("span");
    nameEl.className = "char-name";
    nameEl.textContent = character.name || "初入仙途";
    const identEl = document.createElement("span");
    identEl.className = "char-identity";
    identEl.textContent = [character.identity, character.background].filter(Boolean).join(" · ") || "散修游历";
    mainInfo.append(nameEl, identEl);
    headerCard.append(avatar, mainInfo);

    // 2. 境界与修仙进度
    const realmBox = document.createElement("div");
    realmBox.className = "char-realm-box";
    const realmRow = document.createElement("div");
    realmRow.className = "realm-title-row";
    const rName = document.createElement("span");
    rName.className = "realm-name";
    rName.textContent = realmText;
    const rPerc = document.createElement("span");
    rPerc.className = "realm-percentage";
    rPerc.textContent = progress;
    realmRow.append(rName, rPerc);
    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = Math.min(100, Math.max(0, progressNum)) + "%";
    track.appendChild(fill);
    realmBox.append(realmRow, track);

    // 3. 核心生息数值 (精力/疲劳、灵力、灵石、灵根、地点)
    const statList = document.createElement("div");
    statList.className = "char-stat-list";

    const createStatRow = (label, valText, valClass) => {
      const row = document.createElement("div");
      row.className = "stat-row";
      const l = document.createElement("span");
      l.className = "stat-label";
      l.textContent = label;
      const v = document.createElement("span");
      v.className = "stat-val " + (valClass || "");
      v.textContent = valText;
      row.append(l, v);
      return row;
    };

    statList.append(
      createStatRow("🧘 精力气血", `${100 - fatigueVal} / 100`, fatigueVal > 70 ? "red" : "green"),
      createStatRow("✨ 灵力气海", `${powerVal} 缕`, "cyan"),
      createStatRow("💎 随身灵石", currency, "gold"),
      createStatRow("🌱 先天灵根", character.spiritualRoot || "未觉醒"),
      createStatRow("📍 所处福地", state.gameWorld.location || "玄海荒地")
    );

    // 4. 重要人际关系与好感度 (对应用户需求)
    const relBlock = document.createElement("div");
    relBlock.className = "sidebar-block";
    const relHeader = document.createElement("div");
    relHeader.className = "block-header";
    relHeader.textContent = "👥 道友与人脉";
    const relList = document.createElement("div");
    relList.className = "relation-list";

    const displayRelationships = relationships.length ? relationships : [
      { name: "采药老叟", status: "授业恩公 (好感 +80)" }
    ];

    displayRelationships.forEach((rel) => {
      const item = document.createElement("div");
      item.className = "relation-item";
      const name = document.createElement("span");
      name.className = "relation-npc";
      name.textContent = rel.name || rel.npcId || "修士同行";
      const tag = document.createElement("span");
      tag.className = "relation-tag";
      tag.textContent = rel.status || rel.description || "知交";
      item.append(name, tag);
      relList.appendChild(item);
    });
    relBlock.append(relHeader, relList);

    // 5. 随身行囊
    const invBlock = document.createElement("div");
    invBlock.className = "sidebar-block";
    const invHeader = document.createElement("div");
    invHeader.className = "block-header";
    invHeader.textContent = "🎒 随身行囊";
    const invList = document.createElement("div");
    invList.className = "inventory-list";

    if (inventory.length) {
      inventory.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "inv-chip";
        chip.textContent = `${item.name || "物品"} ×${item.quantity || 1}`;
        invList.appendChild(chip);
      });
    } else {
      const empty = document.createElement("span");
      empty.className = "small-text";
      empty.textContent = "行囊空空如也";
      invList.appendChild(empty);
    }
    invBlock.append(invHeader, invList);

    card.append(headerCard, realmBox, statList, relBlock, invBlock);

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

      // 视觉检定判定卡片（参考用户图：感知、幸运、难度、判定值）
      if (entry.decisionBasis || entry.actionOutcome || (entry.resourceChanges && entry.resourceChanges.length)) {
        const checkCard = document.createElement("div");
        checkCard.className = "check-outcome-card";

        const header = document.createElement("div");
        header.className = "check-card-header";

        const titleGroup = document.createElement("div");
        titleGroup.className = "check-title-group";
        const icon = document.createElement("span");
        icon.className = "check-icon-badge";
        icon.textContent = entry.actionOutcome === "success" ? "✓" : "⚡";

        const name = document.createElement("span");
        name.className = "check-name";
        const actionLabel = (entry.action && entry.action.label) || "推演";
        name.textContent = `${actionLabel}天道判定`;
        titleGroup.append(icon, name);

        const outcomePill = document.createElement("span");
        outcomePill.className = "check-result-pill " + (entry.actionOutcome === "success" ? "success" : "partial");
        outcomePill.textContent = entry.actionOutcome === "success" ? "成功" : "待续";

        header.append(titleGroup, outcomePill);
        checkCard.appendChild(header);

        const chipsRow = document.createElement("div");
        chipsRow.className = "check-chips-row";

        const addChip = (html) => {
          const c = document.createElement("span");
          c.className = "check-chip";
          c.innerHTML = html;
          chipsRow.appendChild(c);
        };

        if (entry.timeCostMinutes) {
          addChip(`⏱️ 历时 <strong>${entry.timeCostMinutes}分钟</strong>`);
        }
        if (entry.decisionBasis) {
          addChip(`✨ 依据 <strong>${entry.decisionBasis}</strong>`);
        }
        checkCard.appendChild(chipsRow);

        if (entry.resourceChanges && entry.resourceChanges.length) {
          const resRow = document.createElement("div");
          resRow.className = "check-detail-lines";
          const changesText = entry.resourceChanges.map((c) =>
            (c.label || "属性") + ": " + (c.change || "") + (c.reason ? " (" + c.reason + ")" : "")
          ).join("  |  ");
          resRow.textContent = "◆ " + changesText;
          checkCard.appendChild(resRow);
        }

        article.appendChild(checkCard);
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

  function initStarterCharacter() {
    const previousState = state;
    const nextState = makeInitialState();
    const starter = (DATA.starters && DATA.starters[0]) || null;

    if (starter && starter.character) {
      nextState.character = clone(starter.character);
      nextState.character.id = "char-" + Date.now().toString(36);
      nextState.world.currentLocationId = starter.initialLocationId || "loc.placeholder-01";
      const locMatch = (WORLD_DATABASE.locations || []).find((l) => l.id === nextState.world.currentLocationId);
      nextState.gameWorld = {
        continent: "待定",
        location: locMatch ? locMatch.name : "【占位地点】",
        faction: "无门无派"
      };
      nextState.updatedAt = {
        inGameDate: "0001-01-01",
        timeOfDayMinutes: 480
      };
      nextState.ledger = [{
        at: clone(nextState.updatedAt),
        action: { id: "init", label: "初踏仙途" },
        actionOutcome: "success",
        narration: `修仙路远，道阻且长。${nextState.character.name}携些许随身用度，自今日始踏上求道长生之路。`,
        observations: ["四方灵气微茫，天道玄远。"],
        timeCostMinutes: 0,
        resourceChanges: [],
        relationshipEventChanges: [],
        nextActions: ["打坐修炼", "探索周边"],
        storyHook: null,
        decisionBasis: "新手启程开局",
        statePatch: {}
      }];
    }
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
    const starterButton = document.createElement("button");
    starterButton.type = "button";
    starterButton.id = "quick-character-btn";
    starterButton.textContent = "新手开局：一键生成角色";
    starterButton.style.marginTop = "6px";
    starterButton.addEventListener("click", () => {
      if (state.character && state.character.name) {
        if (!window.confirm("当前已有角色【" + state.character.name + "】，重新生成会重置当前进度，确认继续吗？")) return;
      }
      initStarterCharacter();
      setMessage("已为你创建初始角色【陆青云】（炼气1层·火木双灵根），现在可以直接点击行动开始修仙！", false);
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
    group.append(button, starterButton, proposal);
    const heading = panel.querySelector("h2, h3");
    if (heading) {
      heading.insertAdjacentElement("afterend", group);
    } else {
      panel.prepend(group);
    }
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
    const heading = panel.querySelector("h2, h3");
    if (heading) {
      heading.insertAdjacentElement("afterend", group);
    } else {
      panel.prepend(group);
    }
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

  const ACTION_PRESETS = {
    cultivate: "在洞府内运转基础心法，吐纳天地灵气温养周天。",
    explore: "前往周边灵气郁积之地巡查，搜寻野外药草与隐秘线索。",
    task: "前往庶务堂领取日常杂役委托，协助宗门或坊市打理灵田。",
    trade: "前往山脚坊市摊位打探行情，采买丹药与符箓补给。",
    social: "与附近的同门或路遇散修攀谈，探听修仙界近期风声与传闻。",
    combat: "前往后山险谷寻觅低阶凶兽切磋，磨砺御气与术法实战。",
    breakthrough: "调息凝神，引全身灵力冲击当前境界屏障，尝试突破！",
    rest: "回石榻闭关静卧调息，运功舒缓疲惫，恢复神识与精力。"
  };

  function generateLocalSimulation(actionId, actionLabel, choice, currentState) {
    const char = currentState.character || {};
    const currProgress = Number(char.cultivationProgress) || 0;
    const currFatigue = (char.fatigue && Number(char.fatigue.value)) || 0;
    const currLvl = (char.realm && Number(char.realm.level)) || 1;
    const currPower = (char.spiritualPower && Number(char.spiritualPower.value)) || 10;
    const currentLoc = currentState.gameWorld.location || "后山洞府";

    let timeCostMinutes = 60;
    let actionOutcome = "success";
    let narration = "";
    let observations = [];
    let resourceChanges = [];
    let relationshipEventChanges = [];
    let nextActions = [];
    let storyHook = null;
    let charPatch = {};

    switch (actionId) {
      case "cultivate": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.cultivate && TUNING.actions.cultivate.timeCostMinutes) || 120;
        const gain = Math.floor(nextRandom() * 6) + 6;
        const newProgress = Math.min(100, currProgress + gain);
        const fatigueGain = 12;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        const fatDesc = newFatigue >= 70 ? "心力困顿" : newFatigue >= 40 ? "微有疲惫" : "神清气爽";

        if (newProgress >= 100) {
          narration = `你盘膝坐定，心神内敛，在${currentLoc}内运转基础心法温养周天。气海灵光大炽，修为已达当前层次的大圆满瓶颈（100%），只待引气冲关，即可尝试【突破】！`;
          observations.push("经脉内灵力充盈至极，隐隐触碰到境界壁障。");
          nextActions.push("尝试突破境界", "调整心境调息");
        } else {
          narration = `你在${currentLoc}之中运转周天吐纳天地灵气。丝丝缕缕的天地清气汇入丹田，温养周天，修为稳步精进（+${gain}%）。`;
          observations.push("吐纳顺畅，心无杂念。");
          nextActions.push("继续闭关修炼", "前往周边探索");
        }
        resourceChanges.push(
          { label: "修为进度", before: `${currProgress}%`, change: `+${gain}%`, after: `${newProgress}%`, reason: "打坐运转心法" },
          { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "运功心神消耗" }
        );
        charPatch.cultivationProgress = newProgress;
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: fatDesc };
        break;
      }
      case "explore": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.explore && TUNING.actions.explore.timeCostMinutes) || 60;
        const fatigueGain = 20;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        const fatDesc = newFatigue >= 70 ? "双腿酸软" : newFatigue >= 40 ? "微感疲惫" : "步履稳健";
        const roll = Math.floor(nextRandom() * 4);

        if (roll === 0) {
          const herb = "野灵草";
          const inv = clone(char.inventory || []);
          const existing = inv.find((item) => item.name === herb);
          if (existing) existing.quantity = (existing.quantity || 1) + 1;
          else inv.push({ id: "item.wild-herb", name: herb, quantity: 1, unit: "株" });

          narration = `你在${currentLoc}周边细细寻查，在石缝中发现了一株散发着微弱灵光的【${herb}】，小心采摘收入囊中。`;
          observations.push(`采摘到一株${herb}。`);
          resourceChanges.push(
            { label: "物品", before: "原背包", change: `+${herb}×1`, after: "已收录", reason: "山野采集" },
            { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "攀山跋涉" }
          );
          charPatch.inventory = inv;
        } else if (roll === 1) {
          const found = Math.floor(nextRandom() * 4) + 2;
          const currencies = clone(char.currencyBalances || []);
          const stoneItem = currencies.find((c) => c.unit === "lowGradeSpiritStone" || c.currency === "下品灵石");
          const beforeAmount = stoneItem ? stoneItem.amount : 0;
          if (stoneItem) stoneItem.amount += found;
          else currencies.push({ currency: "下品灵石", unit: "lowGradeSpiritStone", amount: found });

          narration = `在经过一处旧石穴时，你察觉到碎石中有微光闪烁，仔细翻找居然寻获了 ${found} 枚散落的下品灵石！`;
          observations.push(`收获下品灵石 ${found} 枚。`);
          resourceChanges.push(
            { label: "下品灵石", before: String(beforeAmount), change: `+${found}`, after: String(beforeAmount + found), reason: "遗迹探寻淘得" },
            { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "搜寻石穴" }
          );
          charPatch.currencyBalances = currencies;
        } else if (roll === 2) {
          const gain = Math.floor(nextRandom() * 4) + 3;
          const newProgress = Math.min(100, currProgress + gain);
          narration = `你漫步于山岭烟霞之间，观天地自然气象，心中忽有所悟，修为暗长。`;
          observations.push("观自然之象，灵台一片明澈。");
          resourceChanges.push(
            { label: "修为进度", before: `${currProgress}%`, change: `+${gain}%`, after: `${newProgress}%`, reason: "观悟自然" },
            { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "行路探索" }
          );
          charPatch.cultivationProgress = newProgress;
        } else {
          narration = `你在周边山道巡查半日，虽无额外奇遇，但将方圆地势与路径印记于心。`;
          observations.push("四周灵机稳定，未见明显异动。");
          resourceChanges.push(
            { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "行路巡查" }
          );
        }
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: fatDesc };
        nextActions.push("回洞府休整", "前往市集");
        break;
      }
      case "combat": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.combat && TUNING.actions.combat.timeCostMinutes) || 90;
        const fatigueGain = 30;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        const gain = Math.floor(nextRandom() * 5) + 4;
        const newProgress = Math.min(100, currProgress + gain);
        const inv = clone(char.inventory || []);
        const loot = "低阶兽材";
        const existing = inv.find((item) => item.name === loot);
        if (existing) existing.quantity = (existing.quantity || 1) + 1;
        else inv.push({ id: "item.beast-material", name: loot, quantity: 1, unit: "份" });

        narration = `你在野外遭遇了一只低阶游荡灵兽！你引灵气护住周身，凝神施法沉着应对，几番回合后将其击退，斩获些许灵材。实战令你的真元运转更为纯熟！`;
        observations.push("实战令术法反应更为敏锐。");
        resourceChanges.push(
          { label: "修为进度", before: `${currProgress}%`, change: `+${gain}%`, after: `${newProgress}%`, reason: "实战切磋磨砺" },
          { label: "物品", before: "原背包", change: `+${loot}×1`, after: "已收录", reason: "战利品缴获" },
          { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "激烈搏斗" }
        );
        charPatch.cultivationProgress = newProgress;
        charPatch.inventory = inv;
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: newFatigue >= 70 ? "气血翻腾" : "略有疲乏" };
        nextActions.push("打坐运功调息", "前往市集交易");
        break;
      }
      case "breakthrough": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.breakthrough && TUNING.actions.breakthrough.timeCostMinutes) || 240;
        if (currProgress >= 100) {
          if (currLvl < 9) {
            const nextLvl = currLvl + 1;
            charPatch.realm = { name: "炼气", level: nextLvl, stage: null };
            charPatch.cultivationProgress = 0;
            const newPower = nextLvl * 15;
            charPatch.spiritualPower = { value: newPower, unit: "缕", controlState: "运转如意" };
            charPatch.fatigue = { value: 10, scaleId: "0-100", description: "破关神爽" };
            narration = `气冲紫府，灵海翻腾！体内阻塞的经脉豁然贯通，周身灵力奔涌，你成功打破关隘，晋升至【炼气第 ${nextLvl} 层】！气机更上层楼！`;
            observations.push(`成功突破至炼气${nextLvl}层，灵力上限提升。`);
            resourceChanges.push(
              { label: "境界", before: `炼气${currLvl}层`, change: "+1层", after: `炼气${nextLvl}层`, reason: "突破成功" },
              { label: "修为进度", before: "100%", change: "重置", after: "0%", reason: "开启新层次积淀" },
              { label: "灵力上限", before: `${currPower}缕`, change: `+${newPower - currPower}`, after: `${newPower}缕`, reason: "丹田扩张" }
            );
            nextActions.push("稳固新境界修为", "习练新阶段术法");
          } else {
            narration = `你已达炼气九层圆满境界，灵力充盈至极。脱凡迈入筑基大道机缘已至，筑基主线剧情将于后续篇章展开！`;
            observations.push("炼气境已至顶峰，需谋划筑基机缘。");
            nextActions.push("打探筑基之法", "稳固心境");
          }
        } else {
          actionOutcome = "partial";
          const fatigueGain = 15;
          const newFatigue = Math.min(100, currFatigue + fatigueGain);
          narration = `你心急求成，引全身灵力冲击境界屏障。然而底蕴尚浅（当前修为 ${currProgress}%，尚未圆满），屏障纹丝不动。你只得收功止歇，暗自警惕欲速则不达。`;
          observations.push("底蕴尚浅，需修为达 100% 后再行冲关。");
          resourceChanges.push(
            { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "强行冲关被震荡" }
          );
          charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: "经脉微酸" };
          nextActions.push("耐心闭关修炼", "调息静养");
        }
        break;
      }
      case "rest": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.rest && TUNING.actions.rest.timeCostMinutes) || 360;
        charPatch.fatigue = { value: 0, scaleId: "0-100", description: "神清气爽" };
        charPatch.injuries = [];
        narration = `你在洞府石榻之上安然入定调息。周天自行吐故纳新，抚平心神暗耗。待到再度睁眼，通体舒泰，神清气爽！`;
        observations.push("精力已完全恢复，心神安宁。");
        resourceChanges.push(
          { label: "精力疲劳", before: String(currFatigue), change: `-${currFatigue}`, after: "0", reason: "静修调养" },
          { label: "伤势", before: "旧伤", change: "痊愈", after: "无", reason: "吐故纳新自愈" }
        );
        nextActions.push("精力充沛，可前往探索", "打坐修炼");
        break;
      }
      case "task": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.task && TUNING.actions.task.timeCostMinutes) || 180;
        const fatigueGain = 25;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        const reward = Math.floor(nextRandom() * 5) + 5;
        const currencies = clone(char.currencyBalances || []);
        const stoneItem = currencies.find((c) => c.unit === "lowGradeSpiritStone" || c.currency === "下品灵石");
        const beforeAmount = stoneItem ? stoneItem.amount : 0;
        if (stoneItem) stoneItem.amount += reward;
        else currencies.push({ currency: "下品灵石", unit: "lowGradeSpiritStone", amount: reward });

        narration = `你承接了日常杂事差使，协助打理琐碎庶务。整整半日辛劳奔走，按期完成交付，如约结算了 ${reward} 枚下品灵石酬劳。`;
        observations.push(`完成日常差使，获得下品灵石 ${reward} 枚。`);
        resourceChanges.push(
          { label: "下品灵石", before: String(beforeAmount), change: `+${reward}`, after: String(beforeAmount + reward), reason: "差使酬报" },
          { label: "精力疲劳", before: String(currFatigue), change: `+${fatigueGain}`, after: String(newFatigue), reason: "劳作消耗" }
        );
        charPatch.currencyBalances = currencies;
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: "筋骨酸胀" };
        nextActions.push("前往市集采购", "回洞府休息");
        break;
      }
      case "trade": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.trade && TUNING.actions.trade.timeCostMinutes) || 60;
        const fatigueGain = 6;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        const currencies = clone(char.currencyBalances || []);
        const stoneItem = currencies.find((c) => c.unit === "lowGradeSpiritStone" || c.currency === "下品灵石");
        const stones = stoneItem ? stoneItem.amount : 0;

        if (stones >= 6) {
          stoneItem.amount -= 6;
          const inv = clone(char.inventory || []);
          const pill = "补气丸";
          const existing = inv.find((item) => item.name === pill);
          if (existing) existing.quantity = (existing.quantity || 1) + 1;
          else inv.push({ id: "item.qi-pill", name: pill, quantity: 1, unit: "枚" });
          narration = `你在市集摊铺前驻足，花费 6 枚下品灵石购置了一枚基础【${pill}】收入囊中。`;
          observations.push(`购入${pill}一枚。`);
          resourceChanges.push(
            { label: "下品灵石", before: String(stones), change: "-6", after: String(stoneItem.amount), reason: "购置丹药" },
            { label: "物品", before: "原背包", change: `+${pill}×1`, after: "已收录", reason: "市集采购" }
          );
          charPatch.currencyBalances = currencies;
          charPatch.inventory = inv;
        } else {
          narration = `你在市集各家摊铺前盘点询价。因随身灵石不足（需 6 枚下品灵石），暂未进行采买，仅暗记下物资市价。`;
          observations.push("打探了基础补给的行市。");
        }
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: "行走市井" };
        nextActions.push("去接差使赚取灵石", "回洞府修炼");
        break;
      }
      case "social": {
        timeCostMinutes = (TUNING.actions && TUNING.actions.social && TUNING.actions.social.timeCostMinutes) || 60;
        const fatigueGain = 8;
        const newFatigue = Math.min(100, currFatigue + fatigueGain);
        narration = `你与周遭的几位同道修士拱手攀谈，互通有无，闲话修仙心得，探听近期各方风声见闻。`;
        observations.push("结识同道修士，探听得修仙界见闻传闻。");
        storyHook = null;
        charPatch.fatigue = { value: newFatigue, scaleId: "0-100", description: "精神松弛" };
        nextActions.push("回洞府静修", "巡视周边环境");
        break;
      }
      default: {
        timeCostMinutes = 60;
        narration = `你在${currentLoc}付诸行动：${choice}。一番施为后，事情有了阶段性进展。`;
        charPatch.fatigue = { value: Math.min(100, currFatigue + 10), scaleId: "0-100", description: "精力正常" };
        break;
      }
    }

    return {
      schemaVersion: "0.2",
      result: {
        narration,
        observations,
        actionOutcome,
        decisionBasis: "本地离线模拟规则结算",
        timeCostMinutes,
        resourceChanges,
        relationshipEventChanges,
        nextActions,
        storyHook
      },
      statePatch: {
        character: charPatch
      }
    };
  }

  function runSimulatedAction() {
    if (!pendingAction) {
      setMessage("请先选择左侧的行动类型（如修炼、探索等）。", true);
      return;
    }
    const choice = (el("player-choice").value || "").trim() || (ACTION_PRESETS[pendingAction.id] || "进行常规行动");
    pendingAction.text = choice;

    if (!state.character || !state.character.name) {
      initStarterCharacter();
      setMessage("已自动初始化新手角色【陆青云】，现在开始为你推演行动！", false);
    }

    try {
      const simulated = generateLocalSimulation(pendingAction.id, pendingAction.label, choice, state);
      pendingResult = simulated;
      applyResponse(true);
      setMessage("【推演完成】" + simulated.result.narration, false);
    } catch (err) {
      setMessage("推演失败：" + err.message, true);
    }
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

    const inputWrap = document.createElement("div");
    inputWrap.className = "action-input-wrap";
    const title = document.createElement("span");
    title.id = "selected-action";
    title.textContent = "选择行动后，在此输入具体做法";
    const input = document.createElement("textarea");
    input.id = "player-choice";
    input.rows = 2;
    input.placeholder = "例如：在坊市询问最近的灵草收购价。";
    inputWrap.append(title, input);

    const btnsRow = document.createElement("div");
    btnsRow.className = "action-btns-row";

    const simulateButton = document.createElement("button");
    simulateButton.type = "button";
    simulateButton.id = "simulate-action-btn";
    simulateButton.className = "action-btn primary";
    simulateButton.textContent = "⚡ 运转天道推演";
    simulateButton.addEventListener("click", runSimulatedAction);

    const promptButton = document.createElement("button");
    promptButton.type = "button";
    promptButton.id = "prompt-action-btn";
    promptButton.className = "action-btn";
    promptButton.textContent = "生成 AI 主持提示词";
    promptButton.addEventListener("click", buildPrompt);

    btnsRow.append(simulateButton, promptButton);
    form.append(inputWrap, btnsRow);
    container.append(list, form);
  }

  function selectAction(id, label) {
    pendingAction = { id, label, text: "" };
    pendingResult = null;
    el("apply-response").disabled = true;
    el("ai-response").value = "";
    el("ai-preview").textContent = "";
    el("selected-action").textContent = "当前行动：" + label;

    document.querySelectorAll(".action-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.textContent.includes(label));
    });

    if (ACTION_PRESETS[id]) {
      el("player-choice").value = ACTION_PRESETS[id];
    }
    el("player-choice").focus();
    setMessage("已选【" + label + "】。点击【⚡ 运转天道推演】直接推进，或生成提示词。", false);
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
    setMessage("天道提示词已生成。已为你展开天道推演抽屉。", false);
    const drawer = el("system-drawer");
    const backdrop = el("drawer-backdrop");
    if (drawer) drawer.hidden = false;
    if (backdrop) backdrop.hidden = false;
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
    if (!candidate || (candidate.schemaVersion !== "0.2" && candidate.schemaVersion !== "0.1") ||
        !candidate.character || !candidate.world || !candidate.gameWorld || !candidate.updatedAt ||
        !Array.isArray(candidate.ledger)) {
      throw new Error("不是完整的合规存档。");
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

  function applyResponse(skipConfirm = false) {
    if (!pendingResult || !pendingAction) {
      setMessage("没有可应用的主持结果。", true);
      return;
    }
    const result = pendingResult.result;
    const patch = pendingResult.statePatch;
    if (skipConfirm !== true) {
      if (!window.confirm("将应用行动结果并推进 " + result.timeCostMinutes +
          " 分钟。请确认资源变化无误，继续吗？")) return;
    }

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
    const actionStillPending = result.actionOutcome === "pending";
    setMessage(actionStillPending
      ? "本次结果仍待结算；当前行动已保留，可以继续补充资料并粘贴后续 JSON。"
      : "本次状态变化已应用并保存。", false);
    pendingResult = null;
    if (!actionStillPending) pendingAction = null;
    el("apply-response").disabled = true;
    el("ai-response").value = "";
    if (el("ai-preview")) el("ai-preview").textContent = "";
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
        if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
          setMessage("检测到旧版 v0.1 存档。当前游戏已正式升级至 v0.2 数据驱动架构，旧存档不兼容。请点击【新手开局】重新启程。", true);
          return false;
        }
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

  function setupDrawer() {
    const openBtn = el("open-drawer-btn");
    const drawer = el("system-drawer");
    const closeBtn = el("close-drawer-btn");
    const backdrop = el("drawer-backdrop");

    const open = () => {
      if (drawer) drawer.hidden = false;
      if (backdrop) backdrop.hidden = false;
    };
    const close = () => {
      if (drawer) drawer.hidden = true;
      if (backdrop) backdrop.hidden = true;
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);

    const quickBtn = el("quick-character-btn");
    if (quickBtn) {
      quickBtn.addEventListener("click", () => {
        if (state.character && state.character.name) {
          if (!window.confirm("当前已有角色【" + state.character.name + "】，重新生成会重置当前进度，确认继续吗？")) return;
        }
        initStarterCharacter();
        close();
        setMessage("已为你创建初始角色【陆青云】（炼气1层·火木双灵根），现在可以直接点击行动开始修仙！", false);
      });
    }
  }

  setupDrawer();
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