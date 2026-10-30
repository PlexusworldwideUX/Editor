import JSZip from 'jszip'
import { nodeCss, MARK } from '../render/css'
import { toCss } from '../model/rem'
import { STD_VARIANTS, dropShadowValue, fontCss, isTheme, shadowValue, themeOptions, type Theme } from '../model/theme'
import { walk } from '../model/tree'
import { BREAKPOINT_REM, type DesignNode, type LibraryItem } from '../model/types'
import { validate } from '../model/validate'
import { OUT_OF_BOX } from '../model/library'

export interface ExportInput { page: DesignNode; library: LibraryItem[]; themes: Theme[]; theme: Theme }

const pascal = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map((w) => w[0]?.toUpperCase() + w.slice(1)).join('') || 'Item'

// literal serializer; "@@expr@@" strings are emitted as raw expressions
const IDENT = /^[A-Za-z_$][\w$]*$/
function lit(v: unknown, ind: number): string {
  const pad = '  '.repeat(ind + 1)
  const end = '  '.repeat(ind)
  if (typeof v === 'string') return v.startsWith('@@') ? v.slice(2, -2) : JSON.stringify(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.map((x) => lit(x, ind)).join(', ')}]`
  const entries = Object.entries(v as object).filter(([, x]) => x !== undefined)
  if (!entries.length) return '{}'
  return `{\n${entries.map(([k, x]) => `${pad}${IDENT.test(k) ? k : JSON.stringify(k)}: ${lit(x, ind + 1)},`).join('\n')}\n${end}}`
}

interface Used { icons: Set<string>; items: Set<string>; mui: Set<string>; radius: boolean; assets: Set<string> }
type Lib = Map<string, { item: LibraryItem; comp: string }>
/** data: URLs become real files in the package; other URLs are written as plain strings. */
interface Assets { byData: Map<string, { name: string; data: string }> }
const iconImport = (name: string) => `${name}Icon`
const EXT: Record<string, string> = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

function asset(src: string, assets: Assets, used: Used): string {
  if (!src.startsWith('data:')) return JSON.stringify(src)
  let a = assets.byData.get(src)
  if (!a) {
    const mime = /^data:([^;,]+)/.exec(src)?.[1] ?? 'image/png'
    a = { name: `image${assets.byData.size + 1}.${EXT[mime] ?? 'png'}`, data: src }
    assets.byData.set(src, a)
  }
  used.assets.add(a.name)
  return `asset_${a.name.replace(/\W/g, '_')}`
}

function jsx(n: DesignNode, parent: DesignNode | undefined, lib: Lib, used: Used, assets: Assets, ind: number, isRoot: boolean): string {
  const pad = '  '.repeat(ind)
  const css = nodeCss(n, parent, { radius: MARK.radius, shadow: MARK.shadow })
  if (JSON.stringify(css).includes('@@')) used.radius = true
  const merged = (c: unknown) => (isRoot ? `{[${lit(c, ind)}, ...(Array.isArray(sx) ? sx : [sx])]}` : `{${lit(c, ind)}}`)
  const p = n.props ?? {}
  const str = (k: string, d = '') => JSON.stringify(String(p[k] ?? d))
  const text = str('text')
  const label = isRoot ? `{text ?? ${text}}` : `{${text}}`
  const use = (c: string) => { used.mui.add(c) }
  switch (n.type) {
    case 'instance': {
      const e = lib.get(n.ref ?? '')
      if (!e) return `${pad}{/* missing library item */}`
      used.items.add(e.item.id)
      const t = typeof p.text === 'string' ? ` text=${JSON.stringify(p.text)}` : ''
      return `${pad}<${e.comp} sx={${lit(css, ind)}}${t} />`
    }
    case 'text':
      use('Typography')
      return `${pad}<Typography variant="${p.variant ?? 'body1'}" sx=${merged(css)}>${label}</Typography>`
    case 'button': {
      use('Button')
      let start = ''
      if (p.icon) { used.icons.add(String(p.icon)); start = ` startIcon={<${iconImport(String(p.icon))} />}` }
      return `${pad}<Button variant="${p.variant ?? 'contained'}" color="${p.color ?? 'primary'}" size="${p.size ?? 'medium'}"${start} sx=${merged(css)}>${label}</Button>`
    }
    case 'icon': {
      const name = String(p.icon ?? 'Home')
      used.icons.add(name)
      return `${pad}<${iconImport(name)} sx=${merged({ ...css, fontSize: toCss(Number(p.size ?? 3000)) })} />`
    }
    case 'image': {
      use('Box')
      const src = asset(String(p.src ?? ''), assets, used)
      return `${pad}<Box sx=${merged({ ...css, overflow: 'hidden' })}>\n${pad}  <Box component="img" src={${src}} alt=${str('alt')} sx={{ display: 'block', width: '100%', height: '100%', objectFit: ${str('fit', 'cover')} }} />\n${pad}</Box>`
    }
    case 'input': {
      use('TextField')
      const opt = (k: string, attr: string) => (String(p[k] ?? '') ? ` ${attr}=${str(k)}` : '')
      return `${pad}<TextField${opt('label', 'label')}${opt('placeholder', 'placeholder')}${opt('helper', 'helperText')} variant="${p.variant ?? 'outlined'}" size="${p.size ?? 'medium'}" type="${p.type ?? 'text'}" sx=${merged(css)} />`
    }
    case 'checkbox':
    case 'switch': {
      const C = n.type === 'checkbox' ? 'Checkbox' : 'Switch'
      use('FormControlLabel'); use(C)
      return `${pad}<FormControlLabel label=${str('label')} control={<${C} defaultChecked={${!!p.checked}} color="${p.color ?? 'primary'}" />} sx=${merged(css)} />`
    }
    case 'chip': {
      use('Chip')
      let icon = ''
      if (p.icon) { used.icons.add(String(p.icon)); icon = ` icon={<${iconImport(String(p.icon))} />}` }
      return `${pad}<Chip label=${str('label')} variant="${p.variant ?? 'filled'}" color="${p.color ?? 'default'}" size="${p.size ?? 'medium'}"${icon} sx=${merged(css)} />`
    }
    case 'avatar': {
      use('Avatar')
      const size = toCss(Number(p.size ?? 5000))
      const src = p.src ? ` src={${asset(String(p.src), assets, used)}}` : ''
      return `${pad}<Avatar${src} sx=${merged({ ...css, width: size, height: size })}>${isRoot ? `{text ?? ${text}}` : `{${text}}`}</Avatar>`
    }
    case 'link':
      use('Link')
      return `${pad}<Link href=${str('href', '#')} variant="${p.variant ?? 'body1'}" underline="${p.underline ?? 'hover'}" sx=${merged(css)}>${label}</Link>`
    default: {
      use('Box')
      const kids = (n.children ?? []).map((c) => jsx(c, n, lib, used, assets, ind + 1, false)).join('\n')
      return kids ? `${pad}<Box sx=${merged(css)}>\n${kids}\n${pad}</Box>` : `${pad}<Box sx=${merged(css)} />`
    }
  }
}

function fileFor(name: string, root: DesignNode, lib: Lib, assets: Assets, page: boolean) {
  const used: Used = { icons: new Set(), items: new Set(), mui: new Set(), radius: false, assets: new Set() }
  const body = jsx(root, undefined, lib, used, assets, 2, true)
  const imp: string[] = [...used.mui].sort().map((c) => `import ${c} from '@mui/material/${c}'`)
  imp.push(`import type { SxProps, Theme } from '@mui/material/styles'`)
  for (const i of used.icons) imp.push(`import ${iconImport(i)} from '@mui/icons-material/${i}'`)
  for (const a of used.assets) imp.push(`import asset_${a.replace(/\W/g, '_')} from '../assets/${a}'`)
  for (const id of used.items) { const e = lib.get(id)!; imp.push(`import { ${e.comp} } from '${page ? '../library/' : './'}${e.comp}'`) }
  if (used.radius) imp.push(`import * as tokens from '../theme/tokens'`)
  const hasText = root.type === 'text' || root.type === 'button' || root.type === 'link' || root.type === 'avatar'
  const props = `{ sx${hasText ? ', text' : ''} }: { sx?: SxProps<Theme>${hasText ? '; text?: string' : ''} }`
  return `${imp.join('\n')}\n\nexport function ${name}(${props}) {\n  return (\n${body}\n  )\n}\n`
}

const unit = (t: Theme) => Number(toCss(t.spacingUnit).replace('rem', '')) || 0

function tokensSource(t: Theme) {
  const byMode = (m: 'light' | 'dark') => Object.fromEntries(t.colors.map((c) => [c.id, c[m]]))
  return `// Design tokens. All measurements are rem, base 16. Generated.
export const spacingUnit = ${unit(t)} // rem per spacing step

export const spacing = ${lit(Object.fromEntries(t.spacing.map((x) => [x.id, toCss(x.value)])), 0)} as const

export const radius = ${lit(Object.fromEntries(t.radius.map((x) => [x.id, toCss(x.value)])), 0)} as const

export const shadow = ${lit(Object.fromEntries(t.shadows.map((x) => [x.id, shadowValue(t, x.id)])), 0)} as const

export const dropShadow = ${lit(Object.fromEntries(t.shadows.map((x) => [x.id, dropShadowValue(t, x.id)])), 0)} as const

export const text = ${lit(Object.fromEntries(t.text.map((x) => [x.id, { fontSize: toCss(x.size), fontWeight: x.weight, lineHeight: x.lineHeight, letterSpacing: toCss(x.letterSpacing) }])), 0)} as const

/** Min-widths (rem) used by the responsive container queries. */
export const breakpoints = { mobile: 0, tablet: ${BREAKPOINT_REM.tablet}, desktop: ${BREAKPOINT_REM.desktop} } as const

export const colors = ${lit({ light: byMode('light'), dark: byMode('dark') }, 0)} as const
`
}

/** Type declarations so custom colours and text styles compile in TypeScript. */
function typesSource(t: Theme) {
  const custom = t.text.filter((x) => !(STD_VARIANTS as readonly string[]).includes(x.id)).map((x) => x.id)
  const colors = t.colors.filter((c) => !c.core).map((c) => c.id)
  return `import '@mui/material/styles'
import '@mui/material/Typography'

declare module '@mui/material/styles' {
  interface Palette { custom: { ${colors.map((c) => `${c}: string`).join('; ')} } }
  interface PaletteOptions { custom?: { ${colors.map((c) => `${c}: string`).join('; ')} } }
  interface TypographyVariants { ${custom.map((c) => `${c}: React.CSSProperties`).join('; ')} }
  interface TypographyVariantsOptions { ${custom.map((c) => `${c}?: React.CSSProperties`).join('; ')} }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides { ${custom.map((c) => `${c}: true`).join('; ')} }
}
`
}

const THEME_START = '/* THEME_JSON_START'
const THEME_END = 'THEME_JSON_END */'

/** A single importable theme file: JSON block (round-trips) plus the generated MUI theme. */
export function themeFileSource(t: Theme, embedJson: boolean): string {
  const json = embedJson ? `${THEME_START}\n${JSON.stringify(t)}\n${THEME_END}\n\n` : ''
  return `${json}import { createTheme, type ThemeOptions } from '@mui/material/styles'

const light = ${lit(themeOptions(t, 'light'), 0)} as unknown as ThemeOptions
const dark = ${lit(themeOptions(t, 'dark'), 0)} as unknown as ThemeOptions

export const spacingUnit = ${unit(t)}

export function createAppTheme(mode: 'light' | 'dark' = 'light') {
  return createTheme({
    ...(mode === 'dark' ? dark : light),
    spacing: (factor: number) => \`\${factor * spacingUnit}rem\`,
    breakpoints: { unit: 'rem', values: { xs: 0, sm: ${BREAKPOINT_REM.tablet}, md: ${BREAKPOINT_REM.desktop}, lg: 10000, xl: 100000 } },
  })
}
`
}
export function parseThemeFile(text: string): Theme | null {
  const a = text.indexOf(THEME_START)
  const b = text.indexOf(THEME_END)
  try {
    if (a < 0 || b < 0) {
      const j = JSON.parse(text)
      return isTheme(j) ? j : null
    }
    const j = JSON.parse(text.slice(a + THEME_START.length, b))
    return isTheme(j) ? j : null
  } catch { return null }
}

export function projectFile(i: ExportInput) {
  return JSON.stringify({ format: 'canvas-project', version: 1, page: i.page, library: i.library, themes: i.themes }, null, 2)
}
export function parseProjectFile(text: string): { library: LibraryItem[]; themes: Theme[] } | null {
  try {
    const j = JSON.parse(text)
    if (j.format !== 'canvas-project') return null
    return { library: j.library ?? [], themes: (j.themes ?? []).filter(isTheme) }
  } catch { return null }
}

const b64 = (url: string) => url.slice(url.indexOf(',') + 1)

export async function buildExport(i: ExportInput): Promise<{ zip?: Blob; errors: string[] }> {
  const errors = [...validate(i.page), ...i.library.flatMap((it) => validate(it.root, it.name))]
  if (errors.length) return { errors }

  const byId = new Map(i.library.map((it) => [it.id, it]))
  const needed = new Set<string>()
  const visit = (n: DesignNode) => walk(n, (x) => {
    if (x.type === 'instance' && x.ref && !needed.has(x.ref) && byId.has(x.ref)) { needed.add(x.ref); visit(byId.get(x.ref)!.root) }
  })
  visit(i.page)
  const names = new Set<string>()
  const lib: Lib = new Map()
  for (const id of needed) {
    const item = byId.get(id)!
    let comp = pascal(item.name), k = 2
    while (names.has(comp) || comp === 'Page') comp = `${pascal(item.name)}${k++}`
    names.add(comp)
    lib.set(id, { item, comp })
  }

  const zip = new JSZip()
  const assets: Assets = { byData: new Map() }
  zip.file('src/design/Page.tsx', fileFor('Page', i.page, lib, assets, true))
  for (const { item, comp } of lib.values()) zip.file(`src/library/${comp}.tsx`, fileFor(comp, item.root, lib, assets, false))
  for (const a of assets.byData.values()) {
    const head = a.data.slice(0, a.data.indexOf(','))
    const body = a.data.slice(a.data.indexOf(',') + 1)
    if (head.includes(';base64')) zip.file(`src/assets/${a.name}`, body, { base64: true })
    else zip.file(`src/assets/${a.name}`, decodeURIComponent(body))
  }
  if (assets.byData.size) zip.file('src/assets.d.ts', ["svg", "png", "jpg", "webp", "gif"].map((e) => `declare module '*.${e}' {\n  const src: string\n  export default src\n}`).join('\n') + '\n')
  zip.file('src/theme/tokens.ts', tokensSource(i.theme))
  zip.file('src/theme/theme.ts', themeFileSource(i.theme, false))
  zip.file('src/theme/theme-types.d.ts', typesSource(i.theme))
  zip.file('src/theme/fonts.css', fontCss(i.theme, './fonts/') + '\n')
  for (const f of i.theme.fonts) if (f.source === 'upload' && f.file) zip.file(`src/theme/fonts/${f.file.name}`, b64(f.file.dataUrl), { base64: true })
  zip.file('src/index.ts', `import './theme/fonts.css'\nexport { Page } from './design/Page'\nexport { createAppTheme } from './theme/theme'\n`)
  zip.file('project.json', projectFile(i))
  zip.file('package.json', JSON.stringify({
    name: 'design-export', private: true,
    dependencies: { '@emotion/react': '^11.13.0', '@emotion/styled': '^11.13.0', '@mui/icons-material': '^6.1.0', '@mui/material': '^6.1.0', react: '^18.3.1', 'react-dom': '^18.3.1' },
  }, null, 2))
  zip.file('README.md', `# Design export

Everything that builds the design. All measurements are rem (0.0005rem step, base 16). No pixel values appear in the code.

## Use
\`\`\`tsx
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Page, createAppTheme } from './src'

<ThemeProvider theme={createAppTheme('light')}>
  <CssBaseline />
  <div style={{ containerType: 'inline-size' }}><Page /></div>
</ThemeProvider>
\`\`\`

## Responsive behaviour
Layouts are mobile-first. Tablet (from ${BREAKPOINT_REM.tablet}rem) and desktop (from ${BREAKPOINT_REM.desktop}rem) overrides use CSS container queries, so the wrapper above needs \`container-type: inline-size\`. Place it on a full-width element to respond to the viewport.

## Inventory
- Theme: ${i.theme.name} (light and dark) in src/theme
- Fonts: ${i.theme.fonts.map((f) => f.family).join(', ') || 'none'}
- Library items used: ${[...lib.values()].map((e) => `${e.item.name} (${e.item.kind})`).join(', ') || 'none'}
- Out-of-box elements in the editor: ${OUT_OF_BOX.length}
- project.json re-imports into the editor.
`)
  return { zip: await zip.generateAsync({ type: 'blob' }), errors: [] }
}
