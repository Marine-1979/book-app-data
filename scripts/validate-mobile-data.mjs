import fs from 'node:fs';
const p='dist/mobile-app-data.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};
if(d.schemaVersion!=='1.0') fail('schemaVersion must be 1.0');
if(!Array.isArray(d.materials)||d.materials.length!==38) fail('Expected 38 materials');
const ids=new Set();
for(const m of d.materials){
 if(!/^m\d{3,}$/.test(m.id)||ids.has(m.id)) fail(`Invalid/duplicate id ${m.id}`); ids.add(m.id);
 if(!/^route_\d{2}$/.test(m.route)) fail(`Bad route ${m.id}`);
 if(!m.availableLocales.includes('ru')||!m.availableLocales.includes('en')) fail(`Locales ${m.id}`);
 for(const l of ['ru','en']){if(!m.locales?.[l]?.title||!m.locales?.[l]?.desc||!Array.isArray(m.locales?.[l]?.tags)) fail(`Locale payload ${m.id}/${l}`)}
 if(!m.contentLocales.includes('ru')) fail(`RU content locale required ${m.id}`);
 if(!m.web?.urls?.ru?.startsWith('https://mmalova.com/')) fail(`Bad web URL ${m.id}`);
}
console.log('VALIDATION PASS: 38 unique bilingual catalog objects');
