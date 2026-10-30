import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { rem, toCss, type Ticks } from './rem'
import { BREAKPOINT_REM } from './types'

export const STD_VARIANTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'button', 'caption', 'overline'] as const

export type ColorGroup = 'colour' | 'surface'
/** core tokens map onto MUI palette slots; custom tokens live under palette.custom */
export interface ColorToken { id: string; name: string; group: ColorGroup; light: string; dark: string; core?: boolean }
export interface FontFamily { id: string; family: string; source: 'google' | 'upload' | 'system'; file?: { name: string; mime: string; dataUrl: string } }
export interface TextStyle { id: string; name: string; fontId: string; size: Ticks; weight: number; lineHeight: number; letterSpacing: Ticks }
export interface SpaceToken { id: string; name: string; value: Ticks }
export interface RadiusToken { id: string; name: string; value: Ticks; core?: boolean }
export interface ShadowLayer { x: Ticks; y: Ticks; blur: Ticks; spread: Ticks; color: string; alpha: number }
export interface ShadowToken { id: string; name: string; layers: ShadowLayer[]; core?: boolean }
export interface ButtonSettings {
  textTransform: 'none' | 'uppercase'; weight: number; radius: string; shadow: string
  pad: Record<'small' | 'medium' | 'large', { y: Ticks; x: Ticks }>
}
export interface Theme {
  id: string; name: string
  colors: ColorToken[]; fonts: FontFamily[]; text: TextStyle[]
  spacingUnit: Ticks; spacing: SpaceToken[]; radius: RadiusToken[]; shadows: ShadowToken[]; buttons: ButtonSettings
}

const CORE_PATH: Record<string, string> = {
  primary: 'primary.main', secondary: 'secondary.main', error: 'error.main', warning: 'warning.main', info: 'info.main',
  success: 'success.main', background: 'background.default', surface: 'background.paper',
  textPrimary: 'text.primary', textSecondary: 'text.secondary', divider: 'divider',
}
export const colorPath = (c: ColorToken) => (c.core ? CORE_PATH[c.id] : `custom.${c.id}`)

/** valid JS identifier, unique within `taken` */
export function slug(name: string, taken: string[]): string {
  const words = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
  let id = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w[0].toLowerCase() + w.slice(1))).join('') || 'token'
  if (/^\d/.test(id)) id = 't' + id
  let out = id, n = 2
  while (taken.includes(out)) out = `${id}${n++}`
  return out
}

const c = (id: string, name: string, group: ColorGroup, light: string, dark: string): ColorToken => ({ id, name, group, light, dark, core: true })
const ts = (id: string, name: string, size: number, weight: number, lh: number, ls = 0): TextStyle => ({
  id, name, fontId: 'roboto', size: rem(size), weight, lineHeight: lh, letterSpacing: rem(ls),
})
const lay = (y: number, blur: number, alpha: number, spread = 0): ShadowLayer => ({ x: 0, y: rem(y), blur: rem(blur), spread: rem(spread), color: '#000000', alpha })

export function defaultTheme(id = 'material', name = 'Material (built-in)'): Theme {
  return {
    id, name,
    colors: [
      c('primary', 'Primary', 'colour', '#1976d2', '#90caf9'), c('secondary', 'Secondary', 'colour', '#9c27b0', '#ce93d8'),
      c('error', 'Error', 'colour', '#d32f2f', '#f44336'), c('warning', 'Warning', 'colour', '#ed6c02', '#ffa726'),
      c('info', 'Info', 'colour', '#0288d1', '#29b6f6'), c('success', 'Success', 'colour', '#2e7d32', '#66bb6a'),
      c('textPrimary', 'Text primary', 'colour', '#212121', '#ffffff'), c('textSecondary', 'Text secondary', 'colour', '#616161', '#b0b0b0'),
      c('background', 'Background', 'surface', '#ffffff', '#121212'), c('surface', 'Surface', 'surface', '#ffffff', '#1e1e1e'),
      c('divider', 'Divider', 'surface', '#e0e0e0', '#373737'),
    ],
    fonts: [{ id: 'roboto', family: 'Roboto', source: 'google' }],
    text: [
      ts('h1', 'Heading 1', 6, 300, 1.2, -0.01), ts('h2', 'Heading 2', 3.75, 300, 1.2, -0.005), ts('h3', 'Heading 3', 3, 400, 1.17),
      ts('h4', 'Heading 4', 2.125, 400, 1.235, 0.005), ts('h5', 'Heading 5', 1.5, 400, 1.334), ts('h6', 'Heading 6', 1.25, 500, 1.6, 0.01),
      ts('subtitle1', 'Subtitle 1', 1, 400, 1.75, 0.01), ts('subtitle2', 'Subtitle 2', 0.875, 500, 1.57, 0.005),
      ts('body1', 'Body 1', 1, 400, 1.5, 0.005), ts('body2', 'Body 2', 0.875, 400, 1.43, 0.015),
      ts('caption', 'Caption', 0.75, 400, 1.66, 0.04), ts('overline', 'Overline', 0.75, 400, 2.66, 0.1),
    ],
    spacingUnit: rem(0.5),
    spacing: [['xs', 0.25], ['sm', 0.5], ['md', 1], ['lg', 1.5], ['xl', 2], ['xxl', 3]].map(([i, v]) => ({ id: String(i), name: String(i).toUpperCase(), value: rem(Number(v)) })),
    radius: [
      { id: 'none', name: 'None', value: 0, core: true }, { id: 'control', name: 'Control', value: rem(0.25), core: true },
      { id: 'card', name: 'Card', value: rem(0.5), core: true }, { id: 'full', name: 'Full', value: rem(62.5), core: true },
    ],
    shadows: [
      { id: 'none', name: 'None', layers: [], core: true },
      { id: 'sm', name: 'Small', layers: [lay(0.0625, 0.125, 0.2), lay(0.0625, 0.0625, 0.14)] },
      { id: 'md', name: 'Medium', layers: [lay(0.125, 0.5, 0.2), lay(0.25, 0.5, 0.1)] },
      { id: 'lg', name: 'Large', layers: [lay(0.5, 1.5, 0.25), lay(0.25, 0.5, 0.1)] },
    ],
    buttons: {
      textTransform: 'uppercase', weight: 500, radius: 'control', shadow: 'sm',
      pad: { small: { y: rem(0.25), x: rem(0.625) }, medium: { y: rem(0.375), x: rem(1) }, large: { y: rem(0.5), x: rem(1.375) } },
    },
  }
}

export const isTheme = (t: unknown): t is Theme => {
  const x = t as Theme
  return !!x && Array.isArray(x.colors) && Array.isArray(x.text) && Array.isArray(x.radius) && Array.isArray(x.shadows) && !!x.buttons
}

/** Themes saved earlier listed Divider as a plain colour; it is a surface (it is used as a fill). */
export const fixTheme = (t: Theme): Theme => ({ ...t, colors: t.colors.map((c) => (c.id === 'divider' && c.core ? { ...c, group: 'surface' as const } : c)) })

export const radiusValue = (t: Theme, token: string | undefined): string | undefined => {
  if (!token) return undefined
  const r = t.radius.find((x) => x.id === token)
  return r ? toCss(r.value) : undefined
}
const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '').padEnd(6, '0')
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`
}
export const shadowValue = (t: Theme, token: string | undefined): string | undefined => {
  if (!token) return undefined
  const s = t.shadows.find((x) => x.id === token)
  if (!s) return undefined
  return s.layers.length
    ? s.layers.map((l) => `${toCss(l.x)} ${toCss(l.y)} ${toCss(l.blur)} ${toCss(l.spread)} ${rgba(l.color, l.alpha)}`).join(', ')
    : 'none'
}

/** Same shadow as a CSS filter, so it follows the shape of transparent content (text, icons, children). */
export const dropShadowValue = (t: Theme, token: string | undefined): string | undefined => {
  if (!token) return undefined
  const s = t.shadows.find((x) => x.id === token)
  if (!s) return undefined
  return s.layers.length ? s.layers.map((l) => `drop-shadow(${toCss(l.x)} ${toCss(l.y)} ${toCss(l.blur)} ${rgba(l.color, l.alpha)})`).join(' ') : 'none'
}

const fam = (t: Theme, id: string) => {
  const f = t.fonts.find((x) => x.id === id) ?? t.fonts[0]
  return f ? `"${f.family}", sans-serif` : 'sans-serif'
}

/** JSON-safe MUI options; also used verbatim by the code exporter. */
export function themeOptions(t: Theme, mode: 'light' | 'dark'): ThemeOptions {
  const val = (id: string) => t.colors.find((x) => x.id === id)?.[mode] ?? '#000000'
  const body = t.text.find((x) => x.id === 'body1') ?? t.text[0]
  const typography: Record<string, unknown> = { htmlFontSize: 16, fontFamily: body ? fam(t, body.fontId) : 'sans-serif' }
  for (const s of t.text)
    typography[s.id] = { fontFamily: fam(t, s.fontId), fontSize: toCss(s.size), fontWeight: s.weight, lineHeight: s.lineHeight, letterSpacing: toCss(s.letterSpacing) }
  const custom: Record<string, string> = {}
  for (const col of t.colors) if (!col.core) custom[col.id] = col[mode]
  const b = t.buttons
  const btn: Record<string, unknown> = {
    root: { borderRadius: radiusValue(t, b.radius) ?? '0', textTransform: b.textTransform, fontWeight: b.weight },
    contained: { boxShadow: shadowValue(t, b.shadow) ?? 'none' },
    outlined: { borderWidth: '0.0625rem' },
  }
  for (const [size, { y, x }] of Object.entries(b.pad)) {
    const S = size[0].toUpperCase() + size.slice(1)
    btn[`size${S}`] = { padding: `${toCss(y)} ${toCss(x)}` }
    btn[`outlinedSize${S}`] = { padding: `calc(${toCss(y)} - 0.0625rem) calc(${toCss(x)} - 0.0625rem)` }
    btn[`textSize${S}`] = { padding: `${toCss(y)} ${toCss(Math.round(x / 2))}` }
  }
  return {
    palette: {
      mode,
      primary: { main: val('primary') }, secondary: { main: val('secondary') }, error: { main: val('error') },
      warning: { main: val('warning') }, info: { main: val('info') }, success: { main: val('success') },
      background: { default: val('background'), paper: val('surface') },
      text: { primary: val('textPrimary'), secondary: val('textSecondary') }, divider: val('divider'),
      custom,
    },
    shape: { borderRadius: (radiusValue(t, 'control') ?? '0') as unknown as number },
    typography,
    components: { MuiButton: { styleOverrides: btn } },
  } as unknown as ThemeOptions
}

export function buildMuiTheme(t: Theme, mode: 'light' | 'dark') {
  const unit = Number(toCss(t.spacingUnit).replace('rem', '')) || 0
  return createTheme({
    ...themeOptions(t, mode),
    spacing: (f: number) => `${f * unit}rem`,
    breakpoints: {
      unit: 'rem',
      values: { xs: BREAKPOINT_REM.mobile, sm: BREAKPOINT_REM.tablet, md: BREAKPOINT_REM.desktop, lg: 1e4, xl: 1e5 },
    },
  })
}

/** CSS needed to load a theme's fonts. `base` rewrites uploaded files to relative urls when given. */
export function fontCss(t: Theme, base?: string): string {
  const out: string[] = []
  for (const f of t.fonts) {
    if (f.source === 'google')
      out.push(`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');`)
    else if (f.source === 'upload' && f.file)
      out.push(`@font-face { font-family: "${f.family}"; src: url('${base ? base + f.file.name : f.file.dataUrl}'); font-weight: 100 900; font-display: swap; }`)
  }
  return out.join('\n')
}
