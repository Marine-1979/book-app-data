#!/usr/bin/env node
/**
 * build-editorial-status.mjs · Stage 5B / v1
 *
 * Внутренний editorial control plane.
 *
 * Читает:
 * - data/materials.json
 * - data/editorial.json
 *
 * По умолчанию пишет:
 * - docs/EDITORIAL_STATUS.md
 *
 * Опции:
 *   --as-of=YYYY-MM-DD
 *   --output=relative/path.md
 *   --validate-only
 *
 * Важно:
 * - НЕ меняет public materials.json;
 * - НЕ пишет editorial-поля в dist/app-data.json;
 * - reviewedAt означает фактическую редакционную проверку;
 * - отсутствие reviewedAt допустимо.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(v => v.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

const validateOnly = process.argv.includes('--validate-only');
const asOfRaw = argValue('as-of') || new Date().toISOString().slice(0, 10);
const outputRel = argValue('output') || 'docs/EDITORIAL_STATUS.md';

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function fail(message) {
  console.error(`EDITORIAL ERROR: ${message}`);
  process.exit(1);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function toDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(raw, days) {
  const d = toDate(raw);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

function diffDays(fromRaw, toRaw) {
  return Math.round((toDate(toRaw) - toDate(fromRaw)) / 86400000);
}

function esc(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

if (!isIsoDate(asOfRaw)) {
  fail(`invalid --as-of date: ${asOfRaw}`);
}

const materialDoc = readJson('data/materials.json');
const editorialDoc = readJson('data/editorial.json');

const materials = Array.isArray(materialDoc.materials) ? materialDoc.materials : [];
const entries = Array.isArray(editorialDoc.materials) ? editorialDoc.materials : [];
const policy = editorialDoc.policy || {};

if (!materials.length) fail('data/materials.json has no materials');
if (!entries.length) fail('data/editorial.json has no materials');

const cycles = {
  rapid: Number(policy.rapidDays),
  regular: Number(policy.regularDays),
  evergreen: Number(policy.evergreenDays)
};

for (const [key, value] of Object.entries(cycles)) {
  if (!Number.isInteger(value) || value <= 0) {
    fail(`invalid review cycle for ${key}`);
  }
}

const reviewSoonDays = Number(policy.reviewSoonDays);
const overdueDays = Number(policy.overdueDays);

if (!Number.isInteger(reviewSoonDays) || reviewSoonDays < 0) {
  fail('invalid reviewSoonDays');
}
if (!Number.isInteger(overdueDays) || overdueDays < 0) {
  fail('invalid overdueDays');
}

const byId = new Map();
for (const material of materials) {
  if (!material || !material.id) fail('material without id');
  if (byId.has(material.id)) fail(`duplicate material id in materials.json: ${material.id}`);
  if (!isIsoDate(material.publishedAt)) {
    fail(`${material.id}: missing/invalid publishedAt`);
  }
  if (material.updatedAt && !isIsoDate(material.updatedAt)) {
    fail(`${material.id}: invalid updatedAt`);
  }
  byId.set(material.id, material);
}

const editorialById = new Map();

for (const entry of entries) {
  const id = String(entry?.materialId || '');
  if (!id) fail('editorial entry without materialId');
  if (editorialById.has(id)) fail(`duplicate editorial materialId: ${id}`);
  if (!byId.has(id)) fail(`unknown editorial materialId: ${id}`);
  if (!Object.prototype.hasOwnProperty.call(cycles, entry.reviewClass)) {
    fail(`${id}: unknown reviewClass "${entry.reviewClass}"`);
  }

  if (entry.reviewedAt) {
    if (!isIsoDate(entry.reviewedAt)) fail(`${id}: invalid reviewedAt`);
    const material = byId.get(id);
    if (toDate(entry.reviewedAt) < toDate(material.publishedAt)) {
      fail(`${id}: reviewedAt earlier than publishedAt`);
    }
    if (toDate(entry.reviewedAt) > toDate(asOfRaw)) {
      fail(`${id}: reviewedAt is in the future relative to ${asOfRaw}`);
    }
  }

  editorialById.set(id, entry);
}

for (const id of byId.keys()) {
  if (!editorialById.has(id)) fail(`missing editorial classification: ${id}`);
}

if (editorialById.size !== byId.size) {
  fail(`editorial/material count mismatch: ${editorialById.size}/${byId.size}`);
}

function freshnessStatus(daysToDue) {
  if (daysToDue > reviewSoonDays) return 'current';
  if (daysToDue >= 0) return 'review_soon';
  if (daysToDue < -overdueDays) return 'overdue';
  return 'review_due';
}

/*
 * Status = календарное состояние.
 * Priority = редакционная срочность.
 *
 * P0: быстро меняющийся материал уже due/overdue.
 * P1: regular due/overdue, любой review_soon, evergreen overdue.
 * P2: остальное.
 *
 * Это специально не превращает первый baseline в 20+ материалов P0.
 */
function priority(reviewClass, status) {
  if (reviewClass === 'rapid' && (status === 'review_due' || status === 'overdue')) {
    return 'P0';
  }

  if (
    status === 'review_soon' ||
    (reviewClass === 'regular' && (status === 'review_due' || status === 'overdue')) ||
    (reviewClass === 'evergreen' && status === 'overdue')
  ) {
    return 'P1';
  }

  return 'P2';
}

const rows = materials.map(material => {
  const editorial = editorialById.get(material.id);

  const effectiveDate =
    editorial.reviewedAt ||
    material.updatedAt ||
    material.publishedAt;

  const effectiveSource =
    editorial.reviewedAt ? 'reviewedAt' :
    material.updatedAt ? 'updatedAt' :
    'publishedAt';

  const dueAt = addDays(effectiveDate, cycles[editorial.reviewClass]);
  const daysToDue = diffDays(asOfRaw, dueAt);
  const status = freshnessStatus(daysToDue);

  return {
    id: material.id,
    title: material.title,
    reviewClass: editorial.reviewClass,
    reviewedAt: editorial.reviewedAt || '',
    effectiveDate,
    effectiveSource,
    dueAt,
    daysToDue,
    status,
    priority: priority(editorial.reviewClass, status)
  };
});

const priorityOrder = { P0: 0, P1: 1, P2: 2 };
const classOrder = { rapid: 0, regular: 1, evergreen: 2 };

rows.sort((a, b) =>
  priorityOrder[a.priority] - priorityOrder[b.priority] ||
  classOrder[a.reviewClass] - classOrder[b.reviewClass] ||
  a.daysToDue - b.daysToDue ||
  a.id.localeCompare(b.id)
);

function countBy(field) {
  const out = {};
  for (const row of rows) out[row[field]] = (out[row[field]] || 0) + 1;
  return out;
}

const byPriority = countBy('priority');
const byStatus = countBy('status');
const byClass = countBy('reviewClass');

function mdTable(items) {
  if (!items.length) return '_Нет материалов._\n';

  return [
    '| Priority | ID | Материал | Class | Основание | Review due | Status |',
    '|---|---|---|---|---|---|---|',
    ...items.map(row =>
      `| ${row.priority} | ${row.id} | ${esc(row.title)} | ${row.reviewClass} | ${row.effectiveDate} (${row.effectiveSource}) | ${row.dueAt} | ${row.status} |`
    ),
    ''
  ].join('\n');
}

const actionQueue = rows.filter(r => r.priority !== 'P2').slice(0, 12);
const p0 = rows.filter(r => r.priority === 'P0');
const p1 = rows.filter(r => r.priority === 'P1');
const p2 = rows.filter(r => r.priority === 'P2');

const report = `# EDITORIAL STATUS

**As of:** ${asOfRaw}  
**Материалов:** ${rows.length}  
**P0:** ${byPriority.P0 || 0} · **P1:** ${byPriority.P1 || 0} · **P2:** ${byPriority.P2 || 0}

## Как читать отчет

- **Status** — календарное состояние проверки.
- **Priority** — редакционная срочность с учетом скорости изменения темы.
- \`reviewedAt\` не создается автоматически.
- \`updatedAt\` не меняется, если текст фактически не редактировался.
- Первый baseline закономерно содержит накопленную очередь: после первой редакционной сессии она сокращается.

## Рабочая очередь — первые 12

${mdTable(actionQueue)}
## P0 · Сначала проверить быстро меняющиеся материалы

${mdTable(p0)}
## P1 · Следующая редакционная очередь

${mdTable(p1)}
## P2 · Наблюдение

${mdTable(p2)}
## Сводка

### По классу
- rapid: ${byClass.rapid || 0}
- regular: ${byClass.regular || 0}
- evergreen: ${byClass.evergreen || 0}

### По календарному статусу
- overdue: ${byStatus.overdue || 0}
- review_due: ${byStatus.review_due || 0}
- review_soon: ${byStatus.review_soon || 0}
- current: ${byStatus.current || 0}

## Редакторское действие

После фактической проверки материала:

- актуален без правок → добавить/обновить только \`reviewedAt\` в \`data/editorial.json\`;
- содержание изменено → обновить \`updatedAt\` + \`changeSummary\` в \`data/materials.json\` и \`reviewedAt\` в editorial;
- материал больше не должен использоваться → отдельно решить вопрос его public \`status\`.

`;

if (validateOnly) {
  console.log(
    `Editorial OK: ${rows.length} materials; ` +
    `P0=${byPriority.P0 || 0}, P1=${byPriority.P1 || 0}, P2=${byPriority.P2 || 0}; asOf=${asOfRaw}`
  );
  process.exit(0);
}

const outputPath = path.join(root, outputRel);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report, 'utf8');

console.log(
  `Editorial report built: ${outputRel}; ` +
  `${rows.length} materials; ` +
  `P0=${byPriority.P0 || 0}, P1=${byPriority.P1 || 0}, P2=${byPriority.P2 || 0}; ` +
  `asOf=${asOfRaw}`
);
