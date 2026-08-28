import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const source = read('data/materials.json');
const classification = read('data/mobile/classification.json');
const routes = read('data/mobile/routes.json');
const dictionaries = read('data/mobile/dictionaries.json');
const experts = read('data/mobile/experts.json');
const en = read('data/mobile/translations.en.json');

const materials = Array.isArray(source.materials) ? source.materials : [];
if (materials.length !== 38) throw new Error(`Expected 38 source materials, got ${materials.length}`);
const cls = new Map(classification.materials.map(x => [x.id,x]));
const expertByRu = new Map(experts.items.map(x => [x.locales.ru,x.id]));

const fallbackRuTags = (c) => [...c.taskIds, ...c.themeIds].map(id => {
  for (const group of ['tasks','themes']) {
    if (dictionaries[group]?.[id]?.ru) return dictionaries[group][id].ru;
  }
  return id;
});

const outMaterials = materials.map(m => {
  const c = cls.get(m.id); if (!c) throw new Error(`Missing classification for ${m.id}`);
  const tr = en.materials[m.id]; if (!tr) throw new Error(`Missing EN translation for ${m.id}`);
  const ruTags = Array.isArray(m.tags) && m.tags.length ? m.tags : fallbackRuTags(c);
  const ruLocale = {title:m.title, desc:m.desc, tags:ruTags};
  if (m.changeSummary) ruLocale.changeSummary = m.changeSummary;
  const item = {
    id:m.id, route:c.routeId, type:c.typeId, status:'status_available', level:m.level ?? 1, page:m.page ?? null,
    publishedAt:m.publishedAt ?? null, updatedAt:m.updatedAt ?? null,
    availableLocales:['ru','en'], contentLocales:['ru'],
    locales:{ru:ruLocale,en:{title:tr.title,desc:tr.desc,tags:tr.tags}},
    classification:{taskIds:c.taskIds,audienceIds:c.audienceIds,themeIds:c.themeIds},
    origin:c.origin, sourceKind:c.sourceKind,
    web:{urls:{ru:m.link}}
  };
  const expertId = m.expert_name ? expertByRu.get(m.expert_name) : null;
  if (expertId) item.expertId = expertId;
  return item;
});

let sourceCommit = 'local';
let generatedAt = new Date().toISOString();
try {
  sourceCommit = execSync('git rev-parse --short=12 HEAD', {encoding:'utf8'}).trim();
  generatedAt = execSync('git log -1 --format=%cI HEAD', {encoding:'utf8'}).trim();
} catch (_) {}
const dataVersion = `${generatedAt.slice(0,10)}.${sourceCommit}`;
const output = {
  schemaVersion:'1.0', dataVersion, generatedAt, sourceCommit, contentPolicy:{enCatalogStatus:'editorial_draft',fullContentDefaultLocale:'ru'}, defaultLocale:'ru', supportedLocales:['ru','en'],
  dictionaries, routes:routes.items, experts:experts.items, materials:outMaterials,
  updates:outMaterials.filter(x=>x.updatedAt).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,12).map(x=>({materialId:x.id,updatedAt:x.updatedAt}))
};
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/mobile-app-data.json'),JSON.stringify(output,null,2)+'\n');
console.log(`mobile-app-data.json: ${outMaterials.length} materials, ${output.supportedLocales.join('/')}`);
