 * Количество материалов в маршрутах пересчитывается автоматически.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const materialsDoc = readJson('data/materials.json');
const routesDoc = readJson('data/routes.json');
const dictionariesDoc = readJson('data/dictionaries.json');

const materials = [...materialsDoc.materials].sort((a, b) => {
  const ai = Number(String(a.id).replace(/\D/g, '')) || 0;
  const bi = Number(String(b.id).replace(/\D/g, '')) || 0;
  return ai - bi;
});

const counts = new Map();

for (const item of materials) {
  counts.set(item.route, (counts.get(item.route) || 0) + 1);
}

const routes = [...routesDoc.routes]
  .sort((a, b) => String(a.num).localeCompare(String(b.num), 'ru'))
  .map(route => ({
    ...route,
    count: counts.get(route.num) || 0
  }));

const output = {
  build: {
    schemaVersion: '2.0.0',
    sourceCommit: process.env.GITHUB_SHA || 'local',
    generatedAt: new Date().toISOString()
  },
  meta: materialsDoc.meta || {},
  dictionaries: {
    tasks: Array.isArray(dictionariesDoc.tasks)
      ? dictionariesDoc.tasks
      : [],
    audiences: Array.isArray(dictionariesDoc.audiences)
      ? dictionariesDoc.audiences
      : [],
    bookThemes: Array.isArray(dictionariesDoc.bookThemes)
      ? dictionariesDoc.bookThemes
      : []
  },
  routes,
  materials
};

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'app-data.json');
fs.writeFileSync(
  outPath,
  JSON.stringify(output, null, 2) + '\n',
  'utf8'
);

console.log(
  `Собран ${outPath}: ` +
  `${materials.length} материалов, ` +
  `${routes.length} маршрутов, ` +
  `${output.dictionaries.tasks.length} задач, ` +
  `${output.dictionaries.audiences.length} аудиторий, ` +
  `${output.dictionaries.bookThemes.length} тем книги.`
);
