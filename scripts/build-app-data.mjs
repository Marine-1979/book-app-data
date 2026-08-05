#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const materialsDoc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'materials.json'), 'utf8'));
const routesDoc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'routes.json'), 'utf8'));

const materials = [...materialsDoc.materials].sort((a, b) => {
  const ai = Number(String(a.id).replace(/\D/g, '')) || 0;
  const bi = Number(String(b.id).replace(/\D/g, '')) || 0;
  return ai - bi;
});

const counts = new Map();
for (const item of materials) counts.set(item.route, (counts.get(item.route) || 0) + 1);

const routes = [...routesDoc.routes]
  .sort((a, b) => String(a.num).localeCompare(String(b.num), 'ru'))
  .map(route => ({ ...route, count: counts.get(route.num) || 0 }));

const output = {
  build: {
    schemaVersion: '1.0.0',
    sourceCommit: process.env.GITHUB_SHA || 'local',
    generatedAt: new Date().toISOString()
  },
  meta: materialsDoc.meta || {},
  routes,
  materials
};

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'app-data.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Собран ${outPath}: ${materials.length} материалов, ${routes.length} маршрутов.`);
