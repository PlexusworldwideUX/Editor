// Builds src/render/icons-data.json from @mui/icons-material so the editor can draw any icon without
// importing 10,000 modules. Exported code still imports icons from @mui/icons-material by name.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
const dir = 'node_modules/@mui/icons-material/esm/'
const out = {}
let skipped = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js' || !/^[A-Z0-9]/.test(f)) continue
  const src = readFileSync(dir + f, 'utf8')
  const els = []
  for (const m of src.matchAll(/_jsx\("(\w+)",\s*\{([^}]*)\}/g)) {
    const attrs = {}
    for (const a of m[2].matchAll(/(\w+):\s*"([^"]*)"/g)) attrs[a[1]] = a[2]
    els.push(Object.keys(attrs).length === 1 && attrs.d && m[1] === 'path' ? attrs.d : [m[1], attrs])
  }
  if (!els.length) { skipped++; continue }
  out[f.slice(0, -3)] = els
}
writeFileSync('src/render/icons-data.json', JSON.stringify(out))
console.log(Object.keys(out).length, 'icons', skipped, 'skipped')
