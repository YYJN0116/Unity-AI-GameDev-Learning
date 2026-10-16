/**
 * validate-schema.js
 * 纯 Node 静态校验器：校验 data/*.json 的 Schema 规范性、反向必填字段、唯一性与引用完整性。
 *
 * 覆盖规范：
 * 1. v0.1-data-standard.md 核心标准（逆向必填反查、禁止 vitality、货币/单位两义检查）
 * 2. 04_M0交付物技术审查_v1 (T1, T2, T4)
 * 3. 05_人物卡规范与模板_v1 (C2 动机硬性四栏、C3 引用完整性、C4 flag 命名空间)
 *
 * 报告格式：文件 + ID + 字段路径 + 违规原因。
 */

const fs = require('fs');
const path = require('path');

let baseDir = path.resolve(__dirname, '..', '可运行测试第一版');
if (!fs.existsSync(path.join(baseDir, 'data'))) {
  baseDir = path.resolve(__dirname, '..');
}
const dataDir = path.join(baseDir, 'data');

let hasErrors = false;
let warningCount = 0;

function error(file, id, field, reason) {
  console.error(`❌ [SCHEMA ERROR] File: ${file} | ID: ${id || 'N/A'} | Field: ${field} | Reason: ${reason}`);
  hasErrors = true;
}

function warn(file, id, field, message) {
  console.warn(`⚠️ [SCHEMA WARN] File: ${file} | ID: ${id || 'N/A'} | Field: ${field} | Message: ${message}`);
  warningCount++;
}

// 缓存引用的 ID 集合，供外键校验
const knownLocations = new Set();
const knownRegions = new Set();
const knownFactions = new Set();
const knownCurrencies = new Set();

const CHARACTER_REQUIRED_FIELDS = [
  'id', 'name', 'age', 'background', 'identity',
  'spiritualRoot', 'constitution', 'realm',
  'cultivationProgress', 'spiritualPower', 'fatigue',
  'injuries', 'inventory', 'currencyBalances',
  'relationships', 'reputation', 'debts', 'goals', 'activeTasks'
];

const VALID_AFFINITY = ['cold', 'neutral', 'warm', 'close'];
const VALID_TRUST = ['suspicious', 'wary', 'trusting', 'reliant'];
const VALID_RESPECT = ['dismissive', 'neutral', 'respectful', 'reverent'];
const VALID_FEAR = ['none', 'wary', 'fearful'];

function validateWorld(worldFile) {
  if (!fs.existsSync(worldFile)) {
    error('world.json', null, 'root', 'File does not exist.');
    return;
  }
  let world;
  try {
    world = JSON.parse(fs.readFileSync(worldFile, 'utf8'));
  } catch (e) {
    error('world.json', null, 'json_syntax', e.message);
    return;
  }

  if (world.schemaVersion !== '0.2') {
    error('world.json', null, 'schemaVersion', `Expected "0.2", got "${world.schemaVersion}".`);
  }

  const seenIds = new Set();
  ['regions', 'locations', 'factions'].forEach(section => {
    if (!Array.isArray(world[section])) {
      error('world.json', null, section, 'Must be an array.');
      return;
    }
    world[section].forEach((item, idx) => {
      const id = item.id;
      if (!id || typeof id !== 'string') {
        error('world.json', null, `${section}[${idx}].id`, 'Missing or invalid id string.');
      } else if (seenIds.has(id)) {
        error('world.json', id, `${section}[${idx}].id`, `Duplicate id "${id}".`);
      } else {
        seenIds.add(id);
        if (section === 'locations') knownLocations.add(id);
        if (section === 'regions') knownRegions.add(id);
        if (section === 'factions') knownFactions.add(id);
      }

      if (!item.name || typeof item.name !== 'string') {
        error('world.json', id, `${section}[${idx}].name`, 'Missing or invalid name.');
      }

      if (item.canon === false) {
        warn('world.json', id, `${section}[${idx}].canon`, `Item "${item.name}" is marked as non-canon placeholder.`);
      }
    });
  });
}

function validateTuning(tuningFile) {
  if (!fs.existsSync(tuningFile)) {
    error('tuning.json', null, 'root', 'File does not exist.');
    return;
  }
  let tuning;
  try {
    tuning = JSON.parse(fs.readFileSync(tuningFile, 'utf8'));
  } catch (e) {
    error('tuning.json', null, 'json_syntax', e.message);
    return;
  }

  if (tuning.schemaVersion !== '0.2') {
    error('tuning.json', null, 'schemaVersion', `Expected "0.2", got "${tuning.schemaVersion}".`);
  }

  // fatigue
  if (!tuning.fatigue || typeof tuning.fatigue.min !== 'number' || typeof tuning.fatigue.max !== 'number') {
    error('tuning.json', null, 'fatigue', 'Missing min or max numbers.');
  }
  if (!tuning.fatigue.thresholds || typeof tuning.fatigue.thresholds !== 'object') {
    error('tuning.json', null, 'fatigue.thresholds', 'Missing fatigue thresholds.');
  }

  // cultivation
  if (!tuning.cultivation || typeof tuning.cultivation.min !== 'number' || typeof tuning.cultivation.max !== 'number') {
    error('tuning.json', null, 'cultivation', 'Missing cultivation min or max.');
  }

  // time
  if (!tuning.time || typeof tuning.time.minutesPerShichen !== 'number' || typeof tuning.time.minutesPerDay !== 'number') {
    error('tuning.json', null, 'time', 'Missing time configuration (minutesPerShichen, minutesPerDay).');
  }

  // currencies (T2)
  if (!tuning.currencies || typeof tuning.currencies !== 'object') {
    error('tuning.json', null, 'currencies', 'Missing currencies object.');
  } else {
    for (const [key, curr] of Object.entries(tuning.currencies)) {
      knownCurrencies.add(key);
      if (!curr.displayName) error('tuning.json', key, `currencies.${key}.displayName`, 'Missing displayName.');
      if (!curr.displayUnit) error('tuning.json', key, `currencies.${key}.displayUnit`, 'Missing displayUnit.');
      if (curr.unit) {
        error('tuning.json', key, `currencies.${key}.unit`, 'Forbidden field "unit": Rename to "displayUnit" to avoid one-word-two-meanings conflict.');
      }
      if (curr.exchange) {
        if (!curr.exchange.to || typeof curr.exchange.rate !== 'number') {
          error('tuning.json', key, `currencies.${key}.exchange`, 'Exchange must have "to" string and "rate" number.');
        }
      }
    }
  }

  // actions
  const requiredActions = ['cultivate', 'explore', 'task', 'trade', 'social', 'combat', 'breakthrough', 'rest'];
  if (!tuning.actions || typeof tuning.actions !== 'object') {
    error('tuning.json', null, 'actions', 'Missing actions mapping object.');
  } else {
    for (const act of requiredActions) {
      if (!tuning.actions[act]) {
        error('tuning.json', act, `actions.${act}`, `Missing required action definition "${act}".`);
      } else {
        if (typeof tuning.actions[act].timeCostMinutes !== 'number' || tuning.actions[act].timeCostMinutes <= 0) {
          error('tuning.json', act, `actions.${act}.timeCostMinutes`, 'Must be a positive number.');
        }
        if (!tuning.actions[act].label) {
          error('tuning.json', act, `actions.${act}.label`, 'Missing label.');
        }
      }
    }
  }
}

function validateCharacterCommon(file, idPrefix, character) {
  if (!character || typeof character !== 'object') {
    error(file, idPrefix, 'character', 'Must be an object.');
    return;
  }

  // 1. 反向必填字段检查 (Required fields reverse check)
  for (const field of CHARACTER_REQUIRED_FIELDS) {
    if (!(field in character)) {
      error(file, idPrefix, `character.${field}`, `Required character field "${field}" is MISSING.`);
    }
  }

  // 2. 严禁字段检查 (Forbidden fields)
  if ('vitality' in character) {
    error(file, idPrefix, 'character.vitality', 'Forbidden field "vitality" detected! v0.1-data-standard.md:94 forbids mixing health/vitality. Track wounds via injuries[].');
  }
  if ('spiritRoots' in character) {
    error(file, idPrefix, 'character.spiritRoots', 'Forbidden field "spiritRoots" array. Use single string "spiritualRoot" per v0.1-data-standard.md:49.');
  }

  // 3. 字段具体类型核对
  if (character.spiritualRoot !== undefined && typeof character.spiritualRoot !== 'string') {
    error(file, idPrefix, 'character.spiritualRoot', 'Must be a string.');
  }

  if (character.spiritualPower && typeof character.spiritualPower === 'object') {
    if (!('value' in character.spiritualPower) || !('unit' in character.spiritualPower) || !('controlState' in character.spiritualPower)) {
      error(file, idPrefix, 'character.spiritualPower', 'Must contain value, unit, controlState.');
    }
  }

  if (character.fatigue && typeof character.fatigue === 'object') {
    if (!('value' in character.fatigue) || !('scaleId' in character.fatigue) || !('description' in character.fatigue)) {
      error(file, idPrefix, 'character.fatigue', 'Must contain value, scaleId, description.');
    }
    if ('status' in character.fatigue) {
      error(file, idPrefix, 'character.fatigue.status', 'Use "description" instead of "status" per v0.1 standard.');
    }
  }

  if (Array.isArray(character.currencyBalances)) {
    character.currencyBalances.forEach((bal, idx) => {
      if (!bal.unit || typeof bal.amount !== 'number') {
        error(file, idPrefix, `character.currencyBalances[${idx}]`, 'Must contain unit string and amount number.');
      }
      if ('currency' in bal) {
        error(file, idPrefix, `character.currencyBalances[${idx}].currency`, 'Forbidden field "currency": Display name belongs to tuning.currencies, save stores { unit, amount }.');
      }
    });
  }

  if (Array.isArray(character.inventory)) {
    character.inventory.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        error(file, idPrefix, `character.inventory[${idx}]`, 'Must be an object.');
        return;
      }
      if (!item.itemId || typeof item.itemId !== 'string') {
        error(file, idPrefix, `character.inventory[${idx}].itemId`, 'Missing or invalid itemId string.');
      } else if (knownItems.size > 0 && !knownItems.has(item.itemId)) {
        error(file, idPrefix, `character.inventory[${idx}].itemId`, `Item id "${item.itemId}" does not exist in items.json.`);
      }
      if (!item.name || typeof item.name !== 'string') {
        error(file, idPrefix, `character.inventory[${idx}].name`, 'Missing or invalid name string.');
      }
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 0) {
        error(file, idPrefix, `character.inventory[${idx}].quantity`, 'Quantity must be a non-negative integer.');
      }
      if (!item.unit || typeof item.unit !== 'string') {
        error(file, idPrefix, `character.inventory[${idx}].unit`, 'Missing or invalid unit string.');
      }
      if ('count' in item) {
        error(file, idPrefix, `character.inventory[${idx}].count`, 'Forbidden legacy field "count": Standard field is "quantity".');
      }
    });
  }

  if (Array.isArray(character.relationships)) {
    character.relationships.forEach((rel, idx) => {
      if (!rel.npcId) {
        error(file, idPrefix, `character.relationships[${idx}].npcId`, 'Missing npcId.');
      }
      if (rel.affinity && !VALID_AFFINITY.includes(rel.affinity)) {
        error(file, idPrefix, `character.relationships[${idx}].affinity`, `Invalid affinity "${rel.affinity}". Valid: ${VALID_AFFINITY.join(', ')}`);
      }
      if (rel.trust && !VALID_TRUST.includes(rel.trust)) {
        error(file, idPrefix, `character.relationships[${idx}].trust`, `Invalid trust "${rel.trust}". Valid: ${VALID_TRUST.join(', ')}`);
      }
      if (rel.respect && !VALID_RESPECT.includes(rel.respect)) {
        error(file, idPrefix, `character.relationships[${idx}].respect`, `Invalid respect "${rel.respect}". Valid: ${VALID_RESPECT.join(', ')}`);
      }
      if (rel.fear && !VALID_FEAR.includes(rel.fear)) {
        error(file, idPrefix, `character.relationships[${idx}].fear`, `Invalid fear "${rel.fear}". Valid: ${VALID_FEAR.join(', ')}`);
      }
    });
  }
}

function validateStateTemplate(templateFile) {
  if (!fs.existsSync(templateFile)) {
    error('state-template.json', null, 'root', 'File does not exist.');
    return;
  }
  let tpl;
  try {
    tpl = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  } catch (e) {
    error('state-template.json', null, 'json_syntax', e.message);
    return;
  }

  if (tpl.schemaVersion !== '0.2') {
    error('state-template.json', null, 'schemaVersion', `Expected "0.2", got "${tpl.schemaVersion}".`);
  }

  const rootRequired = ['sessionId', 'rngSeed', 'rngCursor', 'flags', 'updatedAt', 'character', 'gameWorld', 'world', 'ledger'];
  rootRequired.forEach(field => {
    if (!(field in tpl)) {
      error('state-template.json', null, field, `Root state missing required field "${field}".`);
    }
  });

  validateCharacterCommon('state-template.json', 'stateTemplate', tpl.character);
}

function validateStarters(startersDir) {
  if (!fs.existsSync(startersDir)) return;
  const files = fs.readdirSync(startersDir).filter(f => f.endsWith('.json'));
  const starterIds = new Set();

  files.forEach(file => {
    const filePath = path.join(startersDir, file);
    let starter;
    try {
      starter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      error(`starters/${file}`, null, 'json_syntax', e.message);
      return;
    }

    if (!starter.id) {
      error(`starters/${file}`, null, 'id', 'Missing starter id.');
    } else if (starterIds.has(starter.id)) {
      error(`starters/${file}`, starter.id, 'id', `Duplicate starter id "${starter.id}".`);
    } else {
      starterIds.add(starter.id);
    }

    // 外键完整性检查
    if (!starter.startLocationId) {
      error(`starters/${file}`, starter.id, 'startLocationId', 'Missing startLocationId.');
    } else if (!knownLocations.has(starter.startLocationId)) {
      error(`starters/${file}`, starter.id, 'startLocationId', `startLocationId "${starter.startLocationId}" does not exist in world.locations.`);
    }

    validateCharacterCommon(`starters/${file}`, starter.id, starter.character);

    if (starter.canon === false) {
      warn(`starters/${file}`, starter.id, 'canon', `Starter "${starter.name}" is non-canon placeholder.`);
    }
  });
}

function validateNPCs(npcsDir) {
  if (!fs.existsSync(npcsDir)) return;
  const files = fs.readdirSync(npcsDir).filter(f => f.endsWith('.json'));
  const npcIds = new Set();

  files.forEach(file => {
    const filePath = path.join(npcsDir, file);
    let npc;
    try {
      npc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      error(`npcs/${file}`, null, 'json_syntax', e.message);
      return;
    }

    if (!npc.npcId) {
      error(`npcs/${file}`, null, 'npcId', 'Missing npcId.');
      return;
    }
    if (npcIds.has(npc.npcId)) {
      error(`npcs/${file}`, npc.npcId, 'npcId', `Duplicate npcId "${npc.npcId}".`);
    } else {
      npcIds.add(npc.npcId);
    }

    // 外键完整性 (05 C3)
    if (!npc.currentLocationId) {
      error(`npcs/${file}`, npc.npcId, 'currentLocationId', 'Missing currentLocationId.');
    } else if (!knownLocations.has(npc.currentLocationId)) {
      error(`npcs/${file}`, npc.npcId, 'currentLocationId', `currentLocationId "${npc.currentLocationId}" does not exist in world.locations.`);
    }

    if (npc.factionId && !knownFactions.has(npc.factionId)) {
      error(`npcs/${file}`, npc.npcId, 'factionId', `factionId "${npc.factionId}" does not exist in world.factions.`);
    }

    // 硬性必填动机四栏 (05 C2 & §2 A/B)
    if (!npc.currentPressure || typeof npc.currentPressure !== 'string' || !npc.currentPressure.trim()) {
      error(`npcs/${file}`, npc.npcId, 'currentPressure', 'Mandatory field "眼前压力" (currentPressure) is MISSING or EMPTY.');
    }

    if (!npc.knowledgeBoundary || !Array.isArray(npc.knowledgeBoundary.unawareOf) || npc.knowledgeBoundary.unawareOf.length === 0) {
      error(`npcs/${file}`, npc.npcId, 'knowledgeBoundary.unawareOf', 'Mandatory field "不知道的关键事项" (knowledgeBoundary.unawareOf) is MISSING or EMPTY.');
    }

    if (!npc.actionLogic || !npc.actionLogic.willNotDoWithoutReason || !npc.actionLogic.willNotDoWithoutReason.trim()) {
      error(`npcs/${file}`, npc.npcId, 'actionLogic.willNotDoWithoutReason', 'Mandatory field "不会无缘无故做什么" (actionLogic.willNotDoWithoutReason) is MISSING or EMPTY.');
    }

    if (!npc.actionLogic || !npc.actionLogic.fallbackPlan || npc.actionLogic.fallbackPlan.trim() === '' || npc.actionLogic.fallbackPlan.trim() === '无') {
      error(`npcs/${file}`, npc.npcId, 'actionLogic.fallbackPlan', 'Mandatory field "失败或受阻后的替代方案" (actionLogic.fallbackPlan) CANNOT be empty or "无".');
    }

    // flag 命名空间校验 (05 C4: npc.<slug>.*)
    if (Array.isArray(npc.flagsOwned)) {
      const slug = npc.npcId.replace(/^npc\./, '');
      npc.flagsOwned.forEach(flag => {
        if (!flag.startsWith(`npc.${slug}.`)) {
          warn(`npcs/${file}`, npc.npcId, 'flagsOwned', `Flag "${flag}" does not follow namespace convention "npc.${slug}.*".`);
        }
      });
    }

    if (npc.canon === false) {
      warn(`npcs/${file}`, npc.npcId, 'canon', `NPC "${npc.name}" is non-canon placeholder.`);
    }
  });
}

const knownItems = new Set();

function validateItems(itemsFile) {
  if (!fs.existsSync(itemsFile)) {
    error('items/items.json', null, 'root', 'File does not exist.');
    return;
  }
  let items;
  try {
    items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
  } catch (e) {
    error('items/items.json', null, 'json_syntax', e.message);
    return;
  }
  if (!Array.isArray(items)) {
    error('items/items.json', null, 'root', 'Items must be an array.');
    return;
  }
  items.forEach((item, idx) => {
    if (!item.id || typeof item.id !== 'string') {
      error('items/items.json', null, `[${idx}].id`, 'Missing id.');
    } else if (knownItems.has(item.id)) {
      error('items/items.json', item.id, 'id', `Duplicate item id "${item.id}".`);
    } else {
      knownItems.add(item.id);
    }
    if (!item.name || typeof item.name !== 'string') {
      error('items/items.json', item.id, 'name', 'Missing name.');
    }
    if (!item.unit || typeof item.unit !== 'string') {
      error('items/items.json', item.id, 'unit', 'Missing unit.');
    }
    if (typeof item.basePrice !== 'number' || item.basePrice <= 0) {
      error('items/items.json', item.id, 'basePrice', 'Must be a positive number.');
    }
  });
}

function validateNarration(narrationFile) {
  if (!fs.existsSync(narrationFile)) {
    error('text/narration.json', null, 'root', 'File does not exist.');
    return;
  }
  let narr;
  try {
    narr = JSON.parse(fs.readFileSync(narrationFile, 'utf8'));
  } catch (e) {
    error('text/narration.json', null, 'json_syntax', e.message);
    return;
  }
  if (narr.schemaVersion !== '0.2') {
    error('text/narration.json', null, 'schemaVersion', `Expected "0.2", got "${narr.schemaVersion}".`);
  }
  if (!narr.actions || typeof narr.actions !== 'object') {
    error('text/narration.json', null, 'actions', 'Missing actions mapping.');
    return;
  }
  const requiredActions = ['cultivate', 'explore', 'task', 'trade', 'social', 'combat', 'breakthrough', 'rest'];
  requiredActions.forEach(act => {
    if (!narr.actions[act]) {
      error('text/narration.json', act, `actions.${act}`, `Missing narration for action "${act}".`);
    }
  });
  if (!narr.observations || typeof narr.observations !== 'object') {
    error('text/narration.json', null, 'observations', 'Missing observations mapping.');
  }
}

console.log('[validate-schema] Starting schema validation in: ' + dataDir);
validateWorld(path.join(dataDir, 'world.json'));
validateItems(path.join(dataDir, 'items', 'items.json'));
validateTuning(path.join(dataDir, 'tuning.json'));
validateNarration(path.join(dataDir, 'text', 'narration.json'));
validateStateTemplate(path.join(dataDir, 'state-template.json'));
validateStarters(path.join(dataDir, 'starters'));
validateNPCs(path.join(dataDir, 'npcs'));

if (hasErrors) {
  console.error(`\n[validate-schema] ❌ Validation FAILED with errors.`);
  process.exit(1);
} else {
  console.log(`\n[validate-schema] ✅ Validation PASSED cleanly with ${warningCount} warnings (placeholders acknowledged).`);
  process.exit(0);
}
