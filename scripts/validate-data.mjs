#!/usr/bin/env node
/**
 * validate-data.mjs · Stage 2 / v2
 *
 * Проверяет:
 * - базовую структуру materials.json и routes.json;
 * - словари Stage 2 из data/dictionaries.json;
 * - новые поля поиска;
 * - camelCase-даты и временную совместимость со snake_case;
 * - бизнес-ограничения проекта.
 *
 * Внешние npm-зависимости не используются: workflow запускает файл напрямую
 * командой `node scripts/validate-data.mjs`.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const materialsPath = path.join(root, 'data', 'materials.json');
const routesPath = path.join(root, 'data', 'routes.json');
const dictionariesPath = path.join(root, 'data', 'dictionaries.json');
const schemaPath = path.join(root, 'schema', 'materials.schema.json');

let errors = 0;
let warnings = 0;

function fail(message) {
  errors += 1;
  console.error(`::error::${message}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`::warning::${message}`);
}

function info(message) {
  console.log(message);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Не удалось прочитать ${label}: ${error.message}`);
    return null;
  }
}

function duplicates(values) {
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLowerCaseDictionaryValue(value) {
  if (!isNonEmptyString(value)) return false;
  return value === value.toLocaleLowerCase('ru-RU');
}

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateStringArray({
  item,
  field,
  label,
  allowedValues = null,
  requireLowerCase = true
}) {
  if (!(field in item)) return;

  const values = item[field];

  if (!Array.isArray(values)) {
    fail(`${label}: ${field} должен быть массивом.`);
    return;
  }

  const seen = new Set();

  values.forEach((value, index) => {
    const valueLabel = `${label}: ${field}[${index}]`;

    if (!isNonEmptyString(value)) {
      fail(`${valueLabel} должен быть непустой строкой.`);
      return;
    }

    if (requireLowerCase && !isLowerCaseDictionaryValue(value)) {
      fail(`${valueLabel} должен быть записан строчными буквами: "${value}".`);
    }

    if (seen.has(value)) {
      fail(`${label}: в ${field} повторяется значение "${value}".`);
    }

    seen.add(value);

    if (allowedValues && !allowedValues.has(value)) {
      fail(`${valueLabel} содержит значение вне словаря: "${value}".`);
    }
  });
}

function validateDictionaryArray(doc, field) {
  const values = doc?.[field];

  if (!Array.isArray(values) || values.length === 0) {
    fail(`data/dictionaries.json: ${field} должен быть непустым массивом.`);
    return new Set();
  }

  const result = new Set();

  values.forEach((value, index) => {
    const label = `data/dictionaries.json: ${field}[${index}]`;

    if (!isNonEmptyString(value)) {
      fail(`${label} должен быть непустой строкой.`);
      return;
    }

    if (!isLowerCaseDictionaryValue(value)) {
      fail(`${label} должен быть записан строчными буквами: "${value}".`);
    }

    if (result.has(value)) {
      fail(`${label}: значение "${value}" дублируется.`);
    }

    result.add(value);
  });

  return result;
}

const materialsDoc = readJson(materialsPath, 'data/materials.json');
const routesDoc = readJson(routesPath, 'data/routes.json');
const dictionariesDoc = readJson(dictionariesPath, 'data/dictionaries.json');
const schemaDoc = readJson(schemaPath, 'schema/materials.schema.json');

if (!materialsDoc || !routesDoc || !dictionariesDoc || !schemaDoc) {
  process.exit(1);
}

if (schemaDoc.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  warn('schema/materials.schema.json: неожиданное или отсутствующее значение $schema.');
}

const materials = Array.isArray(materialsDoc.materials)
  ? materialsDoc.materials
  : null;

const routes = Array.isArray(routesDoc.routes)
  ? routesDoc.routes
  : null;

if (!materials) {
  fail('data/materials.json должен содержать массив materials.');
}

if (!routes) {
  fail('data/routes.json должен содержать массив routes.');
}

if (errors) {
  process.exit(1);
}

const taskDictionary = validateDictionaryArray(dictionariesDoc, 'tasks');
const audienceDictionary = validateDictionaryArray(dictionariesDoc, 'audiences');
const bookThemeDictionary = validateDictionaryArray(dictionariesDoc, 'bookThemes');

const routeNums = new Set(routes.map(route => route.num));

const allowedTypes = new Set([
  'гайд',
  'видео',
  'статья',
  'кейс',
  'обзор',
  'методика',
  'сообщество',
  'чек-лист',
  'подкаст'
]);

const allowedStatuses = new Set([
  '',
  'доступно',
  'новое',
  'обновлено',
  'скоро'
]);

for (const [id, count] of duplicates(materials.map(item => item.id))) {
  fail(`Дублируется id материала ${id}: ${count} записей.`);
}

for (const [num, count] of duplicates(routes.map(item => item.num))) {
  fail(`Дублируется номер маршрута ${num}: ${count} записей.`);
}

const materialIds = new Set(materials.map(item => item.id));
const actualCounts = new Map();

const missingDescriptions = [];
const blankStatuses = [];
const missingExpertNames = [];
const expertFlagMismatch = [];
const legacyFreshnessStatuses = [];
const legacyDateFields = [];

for (const [index, item] of materials.entries()) {
  const label = item.id || `materials[${index}]`;

  if (!/^m\d{3,}$/.test(String(item.id || ''))) {
    fail(`${label}: id должен иметь вид m001.`);
  }

  if (!/^\d{2}$/.test(String(item.route || ''))) {
    fail(`${label}: route должен иметь вид 01.`);
  }

  if (!routeNums.has(item.route)) {
    fail(`${label}: указан несуществующий маршрут ${item.route}.`);
  }

  if (!isNonEmptyString(item.title)) {
    fail(`${label}: отсутствует title.`);
  }

  if (!allowedTypes.has(item.type)) {
    fail(`${label}: неизвестный type "${item.type}".`);
  }

  if (!Number.isInteger(item.page) || item.page < 1) {
    fail(`${label}: page должен быть положительным целым числом.`);
  }

  if (!/^https:\/\/mmalova\.com\//.test(String(item.link || ''))) {
    fail(`${label}: link должен начинаться с https://mmalova.com/.`);
  }

  if (!Number.isInteger(item.level) || item.level < 1) {
    fail(`${label}: level должен быть положительным целым числом.`);
  }

  if (!allowedStatuses.has(item.status)) {
    fail(`${label}: неизвестный status "${item.status}".`);
  } else if (!String(item.status || '').trim()) {
    blankStatuses.push(label);
  }

  if (item.status === 'новое' || item.status === 'обновлено') {
    legacyFreshnessStatuses.push(label);
  }

  if (!isNonEmptyString(item.desc)) {
    missingDescriptions.push(label);
  }

  if (item.expert === true && !isNonEmptyString(item.expert_name)) {
    missingExpertNames.push(label);
  }

  if (isNonEmptyString(item.expert_name) && item.expert !== true) {
    expertFlagMismatch.push(label);
  }

  if (/тригер/i.test(item.title || '')) {
    warn(`${label}: возможно, опечатка "тригер"; проверьте написание "триггер".`);
  }

  validateStringArray({
    item,
    field: 'tasks',
    label,
    allowedValues: taskDictionary
  });

  validateStringArray({
    item,
    field: 'audiences',
    label,
    allowedValues: audienceDictionary
  });

  validateStringArray({
    item,
    field: 'tags',
    label,
    allowedValues: null
  });

  if ('bookTheme' in item) {
    if (!isNonEmptyString(item.bookTheme)) {
      fail(`${label}: bookTheme должен быть непустой строкой.`);
    } else if (!bookThemeDictionary.has(item.bookTheme)) {
      fail(`${label}: bookTheme содержит значение вне словаря: "${item.bookTheme}".`);
    }
  }

  const hasPublishedAt = Object.prototype.hasOwnProperty.call(item, 'publishedAt');
  const hasPublishedAtLegacy = Object.prototype.hasOwnProperty.call(item, 'published_at');
  const hasUpdatedAt = Object.prototype.hasOwnProperty.call(item, 'updatedAt');
  const hasUpdatedAtLegacy = Object.prototype.hasOwnProperty.call(item, 'updated_at');

  if (hasPublishedAt && hasPublishedAtLegacy) {
    fail(`${label}: нельзя одновременно использовать publishedAt и published_at.`);
  }

  if (hasUpdatedAt && hasUpdatedAtLegacy) {
    fail(`${label}: нельзя одновременно использовать updatedAt и updated_at.`);
  }

  if (hasPublishedAt && !isValidDateString(item.publishedAt)) {
    fail(`${label}: publishedAt должен быть реальной датой YYYY-MM-DD.`);
  }

  if (hasUpdatedAt && !isValidDateString(item.updatedAt)) {
    fail(`${label}: updatedAt должен быть реальной датой YYYY-MM-DD.`);
  }

  if (hasPublishedAtLegacy) {
    legacyDateFields.push(`${label}.published_at`);

    if (!isValidDateString(item.published_at)) {
      fail(`${label}: published_at должен быть реальной датой YYYY-MM-DD.`);
    }
  }

  if (hasUpdatedAtLegacy) {
    legacyDateFields.push(`${label}.updated_at`);

    if (!isValidDateString(item.updated_at)) {
      fail(`${label}: updated_at должен быть реальной датой YYYY-MM-DD.`);
    }
  }

  const publishedValue = hasPublishedAt
    ? item.publishedAt
    : item.published_at;

  const updatedValue = hasUpdatedAt
    ? item.updatedAt
    : item.updated_at;

  if (
    isValidDateString(publishedValue) &&
    isValidDateString(updatedValue) &&
    updatedValue < publishedValue
  ) {
    fail(`${label}: updatedAt не может быть раньше publishedAt.`);
  }

  if ('changeSummary' in item) {
    if (!isNonEmptyString(item.changeSummary) || item.changeSummary.trim().length < 3) {
      fail(`${label}: changeSummary должен содержать минимум 3 символа.`);
    }

    if (!hasUpdatedAt && !hasUpdatedAtLegacy) {
      warn(`${label}: changeSummary заполнен без updatedAt.`);
    }
  }

  if ('shareQuoteId' in item) {
    if (
      !isNonEmptyString(item.shareQuoteId) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(item.shareQuoteId)
    ) {
      fail(`${label}: shareQuoteId содержит недопустимый формат.`);
    }
  }

  if ('parent_id' in item) {
    if (!/^m\d{3,}$/.test(String(item.parent_id || ''))) {
      fail(`${label}: parent_id должен иметь вид m001.`);
    } else if (!materialIds.has(item.parent_id)) {
      fail(`${label}: parent_id ссылается на отсутствующий материал ${item.parent_id}.`);
    } else if (item.parent_id === item.id) {
      fail(`${label}: материал не может ссылаться parent_id на самого себя.`);
    }
  }

  if (
    'anchor' in item &&
    !/^#?[A-Za-zА-Яа-яЁё0-9_-]+$/.test(String(item.anchor || ''))
  ) {
    fail(`${label}: anchor содержит недопустимые символы.`);
  }

  actualCounts.set(item.route, (actualCounts.get(item.route) || 0) + 1);
}

for (const route of routes) {
  const label = `Маршрут ${route.num || 'без номера'}`;

  if (!/^\d{2}$/.test(String(route.num || ''))) {
    fail(`${label}: num должен иметь вид 01.`);
  }

  if (!isNonEmptyString(route.title)) {
    fail(`${label}: отсутствует title.`);
  }

  if (!isNonEmptyString(route.desc)) {
    fail(`${label}: отсутствует desc.`);
  }

  if (!/^\/route\/\d{2}$/.test(String(route.link || ''))) {
    fail(`${label}: link должен иметь вид /route/01.`);
  }

  const actual = actualCounts.get(route.num) || 0;

  if (Number.isInteger(route.count) && route.count !== actual) {
    warn(
      `${label}: count=${route.count}, фактически материалов=${actual}. ` +
      'В dist/app-data.json count должен быть пересчитан.'
    );
  }
}

for (const [link, count] of duplicates(materials.map(item => item.link))) {
  const ids = materials
    .filter(item => item.link === link)
    .map(item => item.id)
    .join(', ');

  warn(
    `Один URL используется ${count} раз (${ids}): ${link}. ` +
    'Допустимо только для осознанной страницы-набора.'
  );
}

if (blankStatuses.length) {
  warn(`Пустой status: ${blankStatuses.join(', ')}.`);
}

if (missingDescriptions.length) {
  warn(
    `Нет desc у ${missingDescriptions.length} материалов. ` +
    'Это не ломает приложение, но ослабляет глобальный поиск.'
  );
}

if (missingExpertNames.length) {
  warn(
    `expert=true, но нет expert_name: ${missingExpertNames.join(', ')}.`
  );
}

if (expertFlagMismatch.length) {
  warn(
    `Есть expert_name, но expert не равен true: ${expertFlagMismatch.join(', ')}.`
  );
}

if (legacyFreshnessStatuses.length) {
  warn(
    `Legacy-статусы «новое/обновлено» без новой модели дат: ` +
    `${legacyFreshnessStatuses.join(', ')}. ` +
    'На Этапе 2 свежесть должна рассчитываться по publishedAt/updatedAt.'
  );
}

if (legacyDateFields.length) {
  warn(
    `Используются legacy-поля дат: ${legacyDateFields.join(', ')}. ` +
    'Замените их на publishedAt/updatedAt.'
  );
}

if (!materialsDoc.meta || typeof materialsDoc.meta !== 'object') {
  warn('В materials.json отсутствует объект meta.');
} else {
  if (!materialsDoc.meta.updated) {
    warn('meta.updated не заполнено.');
  }

  if (!materialsDoc.meta.year) {
    warn('meta.year не заполнено.');
  }

  if ('spark' in materialsDoc.meta) {
    warn(
      'meta.spark является legacy-полем. Не использовать его как ' +
      'неподтвержденную аналитику в блоке «Жизнь книги онлайн».'
    );
  }

  if ('newLast30' in materialsDoc.meta) {
    warn(
      'meta.newLast30 является legacy-полем. В дальнейшем значение ' +
      'нужно рассчитывать только по подтвержденным publishedAt.'
    );
  }

  if ('updatesQuarter' in materialsDoc.meta) {
    warn(
      'meta.updatesQuarter является legacy-полем. Не показывать ' +
      'без подтвержденных дат обновлений.'
    );
  }
}

info(
  `Проверено: ${materials.length} материалов, ` +
  `${routes.length} маршрутов, ` +
  `${taskDictionary.size} задач, ` +
  `${audienceDictionary.size} аудиторий, ` +
  `${bookThemeDictionary.size} тем книги.`
);

info(`Результат: ${errors} ошибок, ${warnings} предупреждений.`);

process.exit(errors ? 1 : 0);
