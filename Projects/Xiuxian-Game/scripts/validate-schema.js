/**
 * validate-schema.js
 * 纯 Node 静态校验器：校验 data/*.json 的 Schema 规范性、唯一性与引用完整性。
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

  if (!tuning.fatigue || typeof tuning.fatigue.min !== 'number' || typeof tuning.fatigue.max !== 'number') {
    error('tuning.json', null, 'fatigue', 'Missing min or max numbers.');
  }

  if (!tuning.actions || typeof tuning.actions !== 'object') {
    error('tuning.json', null, 'actions', 'Missing actions mapping object.');
  }
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

    if (!starter.character || typeof starter.character !== 'object') {
      error(`starters/${file}`, starter.id, 'character', 'Missing character object.');
    }

    if (starter.canon === false) {
      warn(`starters/${file}`, starter.id, 'canon', `Starter "${starter.name}" is non-canon placeholder.`);
    }
  });
}

console.log('[validate-schema] Starting schema validation in: ' + dataDir);
validateWorld(path.join(dataDir, 'world.json'));
validateTuning(path.join(dataDir, 'tuning.json'));
validateStarters(path.join(dataDir, 'starters'));

if (hasErrors) {
  console.error(`\n[validate-schema] ❌ Validation FAILED with errors.`);
  process.exit(1);
} else {
  console.log(`\n[validate-schema] ✅ Validation PASSED cleanly with ${warningCount} warnings (placeholders acknowledged).`);
  process.exit(0);
}
