#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const materialsPath = path.join(root, 'data', 'materials.json');
const routesPath = path.join(root, 'data', 'routes.json');

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
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Не удалось прочитать ${filePath}: ${error.message}`);
    return null;
  }
}
function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1);
}

const materialsDoc = readJson(materialsPath);
const routesDoc = readJson(routesPath);

if (!materialsDoc || !routesDoc) process.exit(1);

const materials = Array.isArray(materialsDoc.materials) ? materialsDoc.materials : null;
const routes = Array.isArray(routesDoc.routes) ? routesDoc.routes : null;

if (!materials) fail('data/materials.json должен содержать массив materials.');
if (!routes) fail('data/routes.json должен содержать массив routes.');
if (errors) process.exit(1);

const routeNums = new Set(routes.map(route => route.num));
const allowedTypes = new Set(['гайд','видео','статья','кейс','обзор','методика','сообщество','чек-лист','подкаст']);
const allowedStatuses = new Set(['доступно','новое','обновлено','скоро']);

for (const [id, count] of duplicates(materials.map(item => item.id))) {
  fail(`Дублируется id материала ${id}: ${count} записей.`);
}
for (const [num, count] of duplicates(routes.map(item => item.num))) {
  fail(`Дублируется номер маршрута ${num}: ${count} записей.`);
}

const actualCounts = new Map();
const missingDescriptions = [];
const blankStatuses = [];
const missingExpertNames = [];
const expertFlagMismatch = [];

for (const [index, item] of materials.entries()) {
  const label = item.id || `materials[${index}]`;

  if (!/^m\d{3,}$/.test(String(item.id || ''))) fail(`${label}: id должен иметь вид m001.`);
  if (!/^\d{2}$/.test(String(item.route || ''))) fail(`${label}: route должен иметь вид 01.`);
  if (!routeNums.has(item.route)) fail(`${label}: указан несуществующий маршрут ${item.route}.`);
  if (!String(item.title || '').trim()) fail(`${label}: отсутствует title.`);
  if (!allowedTypes.has(item.type)) fail(`${label}: неизвестный type "${item.type}".`);
  if (!Number.isInteger(item.page) || item.page < 1) fail(`${label}: page должен быть положительным целым числом.`);
  if (!/^https:\/\/mmalova\.com\//.test(String(item.link || ''))) fail(`${label}: link должен начинаться с https://mmalova.com/.`);
  if (!Number.isInteger(item.level) || item.level < 1) fail(`${label}: level должен быть положительным целым числом.`);

  if (!String(item.status || '').trim()) blankStatuses.push(label);
  else if (!allowedStatuses.has(item.status)) fail(`${label}: неизвестный status "${item.status}".`);

  if (!String(item.desc || '').trim()) missingDescriptions.push(label);
  if (item.expert === true && !String(item.expert_name || '').trim()) missingExpertNames.push(label);
  if (item.expert_name && item.expert !== true) expertFlagMismatch.push(label);
  if (/тригер/i.test(item.title || '')) warn(`${label}: возможно, опечатка "тригер"; проверьте написание "триггер".`);

  actualCounts.set(item.route, (actualCounts.get(item.route) || 0) + 1);
}

for (const route of routes) {
  if (!/^\d{2}$/.test(String(route.num || ''))) fail(`Маршрут ${route.num}: num должен иметь вид 01.`);
  if (!String(route.title || '').trim()) fail(`Маршрут ${route.num}: отсутствует title.`);
  if (!String(route.desc || '').trim()) fail(`Маршрут ${route.num}: отсутствует desc.`);
  if (!/^\/route\/\d{2}$/.test(String(route.link || ''))) fail(`Маршрут ${route.num}: link должен иметь вид /route/01.`);
  const actual = actualCounts.get(route.num) || 0;
  if (Number.isInteger(route.count) && route.count !== actual) {
    warn(`Маршрут ${route.num}: count=${route.count}, фактически материалов=${actual}. В dist/app-data.json count будет пересчитан.`);
  }
}

for (const [link, count] of duplicates(materials.map(item => item.link))) {
  const ids = materials.filter(item => item.link === link).map(item => item.id).join(', ');
  warn(`Один URL используется ${count} раз (${ids}): ${link}. Допустимо только для осознанной страницы-набора.`);
}

if (blankStatuses.length) warn(`Пустой status: ${blankStatuses.join(', ')}.`);
if (missingDescriptions.length) warn(`Нет desc у ${missingDescriptions.length} материалов. Это не ломает приложение, но ослабляет будущий поиск.`);
if (missingExpertNames.length) warn(`expert=true, но нет expert_name: ${missingExpertNames.join(', ')}.`);
if (expertFlagMismatch.length) warn(`Есть expert_name, но expert не равен true: ${expertFlagMismatch.join(', ')}.`);

if (!materialsDoc.meta || typeof materialsDoc.meta !== 'object') {
  warn('В materials.json отсутствует объект meta.');
} else {
  if (!materialsDoc.meta.updated) warn('meta.updated не заполнено.');
  if (!materialsDoc.meta.year) warn('meta.year не заполнено.');
  if (!Array.isArray(materialsDoc.meta.spark)) warn('meta.spark отсутствует или не является массивом.');
}

console.log(`Проверено: ${materials.length} материалов, ${routes.length} маршрутов.`);
console.log(`Результат: ${errors} ошибок, ${warnings} предупреждений.`);

process.exit(errors ? 1 : 0);
