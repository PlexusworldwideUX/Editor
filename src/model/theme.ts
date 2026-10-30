import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { rem, toCss, type Ticks } from './rem'
import { BREAKPOINT_REM } from './types'

export const STD_VARIANTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'button', 'caption', 'overline'] as const

export const TONES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type ColorGroup = 'colour' | 'surface'
export type ColorFamily = 'brand' | 'supporting' | 'greys'
export interface ToneSel { light: number; main: number; dark: number }

/** Colour token. `colour` tokens carry a 50-950 tone scale; `surface` tokens are plain light/dark fills. */
/** What a surface is for. Library masters (page, card, dialog, input, alerts) take the surface with their role. */
export type SurfaceRole = 'page' | 'card' | 'dialog' | 'input' | 'divider' | 'alertError' | 'alertInfo' | 'alertSuccess' | 'alertWarning' | 'custom'
export const SURFACE_ROLES: { role: SurfaceRole; label: string; usedBy: string }[] = [
  { role: 'page', label: 'Page background', usedBy: 'The page itself' },
  { role: 'card', label: 'Card / Paper', usedBy: 'Cards, panels, menus base' },
  { role: 'dialog', label: 'Dialog', usedBy: 'Dialogs, menus, popovers' },
  { role: 'input', label: 'Input', usedBy: 'Text fields and selects' },
  { role: 'divider', label: 'Divider', usedBy: 'Lines between things' },
  { role: 'alertError', label: 'Error alert', usedBy: 'Error messages' },
  { role: 'alertInfo', label: 'Info alert', usedBy: 'Info messages' },
  { role: 'alertSuccess', label: 'Success alert', usedBy: 'Success messages' },
  { role: 'alertWarning', label: 'Warning alert', usedBy: 'Warning messages' },
  { role: 'custom', label: 'Custom', usedBy: 'Anything you pick it for' },
]
export interface ColorToken {
  id: string; name: string; group: ColorGroup; family?: ColorFamily; description?: string
  /** surfaces only: the role decides which library masters use it; refs make Light/Dark follow a colour tone ("primary:50", "white", "black") */
  role?: SurfaceRole; lightRef?: string; darkRef?: string
  light: string; dark: string; core?: boolean
  base?: string; tones?: Record<string, string>; lightSel?: ToneSel; darkSel?: ToneSel; textOn?: string
}
export interface FontFamily { id: string; family: string; source: 'google' | 'upload' | 'system'; file?: { name: string; mime: string; dataUrl: string } }
export interface TextStyle {
  id: string; name: string; description?: string; fontId: string; size: Ticks; weight: number; lineHeight: number; letterSpacing: Ticks
  uppercase?: boolean; italic?: boolean
}
export interface SpaceToken { id: string; name: string; value: Ticks }
export interface RadiusToken { id: string; name: string; description?: string; value: Ticks; core?: boolean }
export interface ShadowLayer { x: Ticks; y: Ticks; blur: Ticks; spread: Ticks; color: string; colorRef?: string; alpha: number }
export interface ShadowToken { id: string; name: string; description?: string; layers: ShadowLayer[]; core?: boolean }

export const BUTTON_STATES = ['enabled', 'hover', 'pressed', 'focused', 'disabled'] as const
export type ButtonStateId = (typeof BUTTON_STATES)[number]
/** How a button part is coloured: a tone of the button's colour, text-on colour, muted grey, or nothing. */
export type Role = 'main' | 'light' | 'dark' | 'tint' | 'on' | 'muted' | 'none'
export const ROLES: Role[] = ['main', 'light', 'dark', 'tint', 'on', 'muted', 'none']
/** A pick is a role of the button's own colour, or any theme colour: "error:600" (a tone), "surface:dialog", "white", "black". */
export type Pick = Role | string
export interface ButtonState { fill: Pick; text: Pick; border: Pick }
export type ButtonVariantId = 'contained' | 'outlined' | 'text'
/** A named button style. `dark` is undefined while Dark mode is automatic (same roles, Dark-mode tones). */
export interface ButtonStyle {
  id: string; name: string; kind: ButtonVariantId; colorId: string; radius: string; textStyle: string; shadow: string
  light: Record<ButtonStateId, ButtonState>
  /** Only the cells overridden for Dark. Any cell not listed follows Light (with Dark-mode tones). */
  dark?: Partial<Record<ButtonStateId, Partial<ButtonState>>>
}
export interface ButtonSettings {
  pad: Record<'small' | 'medium' | 'large', { y: Ticks; x: Ticks }>
  styles: ButtonStyle[]
}
export interface Theme {
  id: string; name: string
  colors: ColorToken[]; fonts: FontFamily[]; mainFontId?: string; text: TextStyle[]
  spacingUnit: Ticks; spacing: SpaceToken[]; radius: RadiusToken[]; shadows: ShadowToken[]; buttons: ButtonSettings
}

// ───────────── colour maths ─────────────
const hex2rgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '').padEnd(6, '0')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
const rgb2hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => {
  const x = hex2rgb(a), y = hex2rgb(b)
  return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t)
}
const lum = (h: string) => {
  const [r, g, b] = hex2rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
export const rating = (ratio: number) => ({ aa: ratio >= 4.5, aaa: ratio >= 7 })
export const textOnAuto = (bg: string) => (contrast(bg, '#ffffff') >= 4.5 || contrast(bg, '#ffffff') >= contrast(bg, '#000000') ? '#ffffff' : '#000000')
export const rgba = (hex: string, a: number) => { const [r, g, b] = hex2rgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})` }

const MIX: Record<number, [string, number]> = {
  50: ['#ffffff', 0.92], 100: ['#ffffff', 0.84], 200: ['#ffffff', 0.68], 300: ['#ffffff', 0.5], 400: ['#ffffff', 0.25],
  500: ['#ffffff', 0], 600: ['#000000', 0.15], 700: ['#000000', 0.3], 800: ['#000000', 0.5], 900: ['#000000', 0.68], 950: ['#000000', 0.82],
}
/** Tone scale from one base colour; tone 500 is the base itself. */
export const genTones = (base: string): Record<string, string> =>
  Object.fromEntries(TONES.map((t) => [String(t), mix(base, MIX[t][0], MIX[t][1])]))

const LSEL: ToneSel = { light: 400, main: 500, dark: 600 }
const DSEL: ToneSel = { light: 200, main: 300, dark: 400 }

/** Recompute the effective light/dark values from the tone scale and selections. */
export const recalc = (c: ColorToken): ColorToken => {
  if (!c.tones) return c
  const ls = c.lightSel ?? LSEL, ds = c.darkSel ?? DSEL
  return { ...c, light: c.tones[String(ls.main)] ?? c.light, dark: c.tones[String(ds.main)] ?? c.dark }
}
export function resolveColor(c: ColorToken, mode: 'light' | 'dark') {
  const v = c[mode]
  if (!c.tones) return { main: v, light: v, dark: v, tint: v, on: c.textOn ?? textOnAuto(v) }
  const s = (mode === 'light' ? c.lightSel : c.darkSel) ?? (mode === 'light' ? LSEL : DSEL)
  const main = c.tones[String(s.main)]
  return { main, light: c.tones[String(s.light)], dark: c.tones[String(s.dark)], tint: c.tones[mode === 'light' ? '50' : '900'], on: c.textOn ?? textOnAuto(main) }
}

const color = (id: string, name: string, family: ColorFamily, base: string, o: Partial<ColorToken> = {}): ColorToken =>
  recalc({ id, name, group: 'colour', family, core: true, light: base, dark: base, base, tones: genTones(base), lightSel: LSEL, darkSel: DSEL, ...o })

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

const ts = (id: string, name: string, description: string, size: number, weight: number, lh: number, ls = 0, extra: Partial<TextStyle> = {}): TextStyle => ({
  id, name, description, fontId: 'roboto', size: rem(size), weight, lineHeight: lh, letterSpacing: rem(ls), ...extra,
})
const lay = (y: number, blur: number, alpha: number, spread = 0): ShadowLayer => ({ x: 0, y: rem(y), blur: rem(blur), spread: rem(spread), color: '#000000', colorRef: 'black', alpha })
const shadow = (id: string, name: string, description: string, layers: ShadowLayer[]): ShadowToken => ({ id, name, description, layers })

const rs = (fill: Role, text: Role, border: Role): ButtonState => ({ fill, text, border })
export const STATES_FOR: Record<ButtonVariantId, Record<ButtonStateId, ButtonState>> = {
  contained: { enabled: rs('main', 'on', 'none'), hover: rs('dark', 'on', 'none'), pressed: rs('dark', 'on', 'none'), focused: rs('main', 'on', 'dark'), disabled: rs('muted', 'muted', 'none') },
  outlined: { enabled: rs('none', 'main', 'main'), hover: rs('tint', 'dark', 'dark'), pressed: rs('tint', 'dark', 'dark'), focused: rs('none', 'main', 'dark'), disabled: rs('none', 'muted', 'muted') },
  text: { enabled: rs('none', 'main', 'none'), hover: rs('tint', 'dark', 'none'), pressed: rs('tint', 'dark', 'none'), focused: rs('none', 'main', 'dark'), disabled: rs('none', 'muted', 'none') },
}
export const newButtonStyle = (id: string, name: string, kind: ButtonVariantId, colorId: string, radius = 'control', shadow?: string): ButtonStyle => ({
  id, name, kind, colorId, radius, textStyle: 'button', shadow: shadow ?? (kind === 'contained' ? 'sm' : 'none'), light: structuredClone(STATES_FOR[kind]),
})
const DEFAULT_STYLES = (): ButtonStyle[] => [
  newButtonStyle('primary', 'Primary', 'contained', 'primary'), newButtonStyle('secondary', 'Secondary', 'contained', 'secondary'),
  newButtonStyle('outline', 'Outline', 'outlined', 'primary'), newButtonStyle('text', 'Text', 'text', 'primary'),
]

export function baseDefaultTheme(id = 'material', name = 'Material (built-in)'): Theme {
  return {
    id, name,
    colors: [
      color('primary', 'Primary', 'brand', '#1976d2', { description: 'Your main brand colour. Drives buttons, links and highlights.' }),
      color('secondary', 'Secondary', 'brand', '#9c27b0', { description: 'A second brand colour for accents.' }),
      color('error', 'Error', 'supporting', '#d32f2f', { description: 'Errors and destructive actions.' }),
      color('warning', 'Warning', 'supporting', '#ed6c02', { description: 'Warnings and cautions.' }),
      color('info', 'Info', 'supporting', '#0288d1', { description: 'Neutral information.' }),
      color('success', 'Success', 'supporting', '#2e7d32', { description: 'Success and confirmation.' }),
      color('textPrimary', 'Text primary', 'greys', '#212121', { description: 'Main reading text.', lightSel: { light: 400, main: 500, dark: 600 }, darkSel: { light: 100, main: 50, dark: 200 } }),
      color('textSecondary', 'Text secondary', 'greys', '#616161', { description: 'Secondary and helper text.', darkSel: { light: 100, main: 200, dark: 300 } }),
    ],
    fonts: [{ id: 'roboto', family: 'Roboto', source: 'google' }],
    mainFontId: 'roboto',
    text: [
      ts('h1', 'Heading 1', 'Page titles', 6, 300, 1.2, -0.01), ts('h2', 'Heading 2', 'Section titles', 3.75, 300, 1.2, -0.005),
      ts('h3', 'Heading 3', 'Large sub-sections', 3, 400, 1.17), ts('h4', 'Heading 4', 'Cards and panels', 2.125, 400, 1.235, 0.005),
      ts('h5', 'Heading 5', 'Small headings', 1.5, 400, 1.334), ts('h6', 'Heading 6', 'Smallest headings', 1.25, 500, 1.6, 0.01),
      ts('subtitle1', 'Subtitle large', 'Lead-in lines', 1, 400, 1.75, 0.01), ts('subtitle2', 'Subtitle small', 'Labels and sub-labels', 0.875, 500, 1.57, 0.005),
      ts('body1', 'Paragraph', 'Normal body text', 1, 400, 1.5, 0.005), ts('body2', 'Paragraph small', 'Secondary details', 0.875, 400, 1.43, 0.015),
      ts('button', 'Button label', 'Text inside buttons', 0.875, 500, 1.75, 0.04, { uppercase: true }),
      ts('caption', 'Caption', 'Notes and helper text', 0.75, 400, 1.66, 0.04), ts('overline', 'Overline', 'Small labels above headings', 0.75, 400, 2.66, 0.1, { uppercase: true }),
    ],
    spacingUnit: rem(0.5),
    spacing: [['xs', 0.25], ['sm', 0.5], ['md', 1], ['lg', 1.5], ['xl', 2], ['xxl', 3]].map(([i, v]) => ({ id: String(i), name: String(i).toUpperCase(), value: rem(Number(v)) })),
    radius: [
      { id: 'none', name: 'None', description: 'Square corners.', value: 0, core: true },
      { id: 'control', name: 'Control', description: 'Buttons, inputs and chips.', value: rem(0.25), core: true },
      { id: 'card', name: 'Surface', description: 'Cards, dialogs and alerts.', value: rem(0.5), core: true },
      { id: 'full', name: 'Full', description: 'Pills and circles.', value: rem(62.5), core: true },
    ],
    shadows: [
      { id: 'none', name: 'None', description: 'Flat.', layers: [], core: true },
      shadow('sm', 'Level 1', 'Cards at rest', [lay(0.0625, 0.125, 0.2), lay(0.0625, 0.0625, 0.14)]),
      shadow('l2', 'Level 2', 'Hovered cards', [lay(0.125, 0.25, 0.2), lay(0.0625, 0.125, 0.14)]),
      shadow('md', 'Level 3', 'Raised buttons', [lay(0.125, 0.5, 0.2), lay(0.25, 0.5, 0.1)]),
      shadow('l4', 'Level 4', 'Menus and dropdowns', [lay(0.25, 0.75, 0.2), lay(0.375, 0.75, 0.1)]),
      shadow('lg', 'Level 5', 'Popovers', [lay(0.5, 1.5, 0.25), lay(0.25, 0.5, 0.1)]),
      shadow('l6', 'Level 6', 'Sticky headers', [lay(0.5, 1.75, 0.25), lay(0.375, 0.75, 0.12)]),
      shadow('l7', 'Level 7', 'Drawers', [lay(0.75, 2.25, 0.28), lay(0.5, 1, 0.12)]),
      shadow('l8', 'Level 8', 'Dialogs', [lay(1, 3, 0.3), lay(0.5, 1.25, 0.14)]),
    ],
    buttons: {
      pad: { small: { y: rem(0.25), x: rem(0.625) }, medium: { y: rem(0.375), x: rem(1) }, large: { y: rem(0.5), x: rem(1.375) } },
      styles: DEFAULT_STYLES(),
    },
  }
}
// surfaces live after the colour tokens so they sort last in lists
const surf = (id: string, name: string, role: SurfaceRole, description: string, light: string, dark: string, o: Partial<ColorToken> = {}): ColorToken =>
  ({ id, name, group: 'surface', role, description, light, dark, ...o })
const DEFAULT_SURFACES = (): ColorToken[] => [
  surf('background', 'Page background', 'page', 'The bottom layer, behind everything on the page.', '#ffffff', '#121212', { core: true, lightRef: 'white' }),
  surf('surface', 'Card / Paper', 'card', 'Cards and panels that sit on the page.', '#ffffff', '#1e1e1e', { core: true, lightRef: 'white' }),
  surf('dialog', 'Dialog', 'dialog', 'Dialogs, menus and popovers.', '#ffffff', '#2a2a2a', { lightRef: 'white' }),
  surf('input', 'Input', 'input', 'Fields and controls.', '#ffffff', '#1e1e1e', { lightRef: 'white' }),
  surf('divider', 'Divider', 'divider', 'Lines between things.', '#e0e0e0', '#373737', { core: true }),
  surf('alertError', 'Error alert', 'alertError', 'Background of error messages.', '#fdeded', '#2a1414', { lightRef: 'error:50', darkRef: 'error:950' }),
  surf('alertInfo', 'Info alert', 'alertInfo', 'Background of info messages.', '#e5f6fd', '#0a1f2a', { lightRef: 'info:50', darkRef: 'info:950' }),
  surf('alertSuccess', 'Success alert', 'alertSuccess', 'Background of success messages.', '#edf7ed', '#10200f', { lightRef: 'success:50', darkRef: 'success:950' }),
  surf('alertWarning', 'Warning alert', 'alertWarning', 'Background of warning messages.', '#fff4e5', '#2a1a05', { lightRef: 'warning:50', darkRef: 'warning:950' }),
]
/** "primary:50", "white", "black" to a hex, using the theme's tone scales. */
export const refHex = (t: Theme, ref: string | undefined, mode: 'light' | 'dark'): string | undefined => {
  if (!ref) return undefined
  if (ref === 'white') return '#ffffff'
  if (ref === 'black') return '#000000'
  const [id, tone] = ref.split(':')
  const c = t.colors.find((x) => x.id === id)
  void mode
  return c?.tones?.[tone]
}
export const refLabel = (t: Theme, ref: string | undefined): string => {
  if (!ref) return 'Custom colour'
  if (ref === 'white') return 'White'
  if (ref === 'black') return 'Black'
  const [id, tone] = ref.split(':')
  return `${t.colors.find((x) => x.id === id)?.name ?? id} ${tone}`
}
/** Surfaces that follow a colour tone take its current value, so editing a colour updates every surface using it. */
export const syncSurfaces = (t: Theme): Theme => ({
  ...t,
  shadows: t.shadows.map((sh) => ({ ...sh, layers: sh.layers.map((l) => { const h = refHex(t, l.colorRef, 'light'); return h ? { ...l, color: h } : l }) })),
  colors: t.colors.map((c) => {
    if (c.group !== 'surface') return c
    const l = refHex(t, c.lightRef, 'light'), d = refHex(t, c.darkRef, 'dark')
    return l || d ? { ...c, light: l ?? c.light, dark: d ?? c.dark } : c
  }),
})
export const defaultThemeFull = (id?: string, name?: string): Theme => { const t = baseDefaultTheme(id, name); return syncSurfaces({ ...t, colors: [...t.colors, ...DEFAULT_SURFACES()] }) }
export const defaultTheme = defaultThemeFull

export const isTheme = (t: unknown): t is Theme => {
  const x = t as Theme
  return !!x && Array.isArray(x.colors) && Array.isArray(x.text) && Array.isArray(x.radius) && Array.isArray(x.shadows) && !!x.buttons
}

/** Bring a theme saved by an older version up to the current shape without changing what it looks like. */
export function upgradeTheme(t: Theme): Theme {
  const def = defaultThemeFull()
  const ROLE_BY_ID: Record<string, SurfaceRole> = { background: 'page', surface: 'card', dialog: 'dialog', input: 'input', divider: 'divider' }
  const ROLE_BY_LABEL: Record<string, SurfaceRole> = { 'Page background': 'page', Card: 'card', Dialog: 'dialog', Input: 'input', Divider: 'divider' }
  let colors = t.colors.map((c) => {
    if (c.id === 'divider' && c.core) c = { ...c, group: 'surface' as const }
    if (c.group === 'surface') {
      const d = def.colors.find((x) => x.id === c.id)
      const legacy = (c as unknown as { role?: string }).role
      const role: SurfaceRole = (SURFACE_ROLES.some((r) => r.role === legacy) ? legacy : ROLE_BY_LABEL[legacy ?? ''] ?? ROLE_BY_ID[c.id] ?? d?.role ?? 'custom') as SurfaceRole
      return { ...c, role, description: c.description ?? d?.description }
    }
    if (c.tones) return c
    const fam: ColorFamily = ['textPrimary', 'textSecondary'].includes(c.id) ? 'greys' : c.core ? (['primary', 'secondary'].includes(c.id) ? 'brand' : 'supporting') : 'brand'
    const d = def.colors.find((x) => x.id === c.id)
    // keep the colour the designer already chose as the base so nothing visibly changes
    return recalc({ ...c, family: c.family ?? fam, base: c.light, tones: genTones(c.light), lightSel: LSEL, darkSel: d?.darkSel ?? DSEL, description: c.description ?? d?.description, dark: c.dark })
  })
  // themes saved before alert surfaces existed get them, so alerts have editable colours
  for (const d of def.colors) if (d.group === 'surface' && d.role?.startsWith('alert') && !colors.some((c) => c.id === d.id)) colors = [...colors, d]
  type Legacy = { radius?: string; shadow?: string; pad?: ButtonSettings['pad']; variants?: Record<string, { radius: string; textStyle: string; shadow: string; states: Record<ButtonStateId, ButtonState> }> }
  const old = t.buttons as unknown as Legacy & Partial<ButtonSettings>
  let styles: ButtonStyle[]
  if (old.styles) styles = old.styles
  else if (old.variants) {
    const v = old.variants
    const from = (id: string, name: string, kind: ButtonVariantId, colorId: string, src: Legacy['variants'] extends infer R ? R extends Record<string, infer V> ? V : never : never): ButtonStyle =>
      ({ id, name, kind, colorId, radius: src.radius, textStyle: src.textStyle, shadow: src.shadow, light: src.states })
    styles = [from('primary', 'Primary', 'contained', 'primary', v.contained), from('secondary', 'Secondary', 'contained', 'secondary', v.contained), from('outline', 'Outline', 'outlined', 'primary', v.outlined), from('text', 'Text', 'text', 'primary', v.text)]
  } else {
    styles = DEFAULT_STYLES().map((s) => ({ ...s, radius: old.radius ?? s.radius, shadow: s.kind === 'contained' ? old.shadow ?? s.shadow : s.shadow }))
  }
  const buttons: ButtonSettings = { pad: old.pad ?? def.buttons.pad, styles }
  const text = t.text.some((s) => s.id === 'button') ? t.text : [...t.text, def.text.find((s) => s.id === 'button')!]
  return syncSurfaces({ ...t, colors, buttons, text: text.map((s) => ({ ...s, description: s.description ?? def.text.find((d) => d.id === s.id)?.description })), mainFontId: t.mainFontId ?? t.fonts[0]?.id,
    radius: t.radius.map((r) => ({ ...r, description: r.description ?? def.radius.find((d) => d.id === r.id)?.description })),
    shadows: t.shadows.map((s) => ({ ...s, description: s.description ?? def.shadows.find((d) => d.id === s.id)?.description })) })
}
/** Which button style a button element uses (older designs stored variant and colour instead). */
export function buttonStyleOf(t: Theme, props: Record<string, unknown> | undefined): ButtonStyle {
  const list = t.buttons.styles
  const direct = list.find((x) => x.id === props?.buttonStyle)
  if (direct) return direct
  const variant = String(props?.variant ?? 'contained'), color = String(props?.color ?? 'primary')
  const legacy = variant === 'outlined' ? 'outline' : variant === 'text' ? 'text' : color === 'secondary' ? 'secondary' : 'primary'
  return list.find((x) => x.id === legacy) ?? list[0]
}
export const fixTheme = upgradeTheme

export const radiusValue = (t: Theme, token: string | undefined): string | undefined => {
  if (!token) return undefined
  const r = t.radius.find((x) => x.id === token)
  return r ? toCss(r.value) : undefined
}
export const shadowValue = (t: Theme, token: string | undefined): string | undefined => {
  if (!token) return undefined
  const s = t.shadows.find((x) => x.id === token)
  if (!s) return undefined
  return s.layers.length ? s.layers.map((l) => `${toCss(l.x)} ${toCss(l.y)} ${toCss(l.blur)} ${toCss(l.spread)} ${rgba(l.color, l.alpha)}`).join(', ') : 'none'
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
export const textCss = (t: Theme, s: TextStyle) => ({
  fontFamily: fam(t, s.fontId), fontSize: toCss(s.size), fontWeight: s.weight, lineHeight: s.lineHeight, letterSpacing: toCss(s.letterSpacing),
  ...(s.uppercase ? { textTransform: 'uppercase' } : {}), ...(s.italic ? { fontStyle: 'italic' } : {}),
})

/** One concrete colour for a button part in a state. */
export function roleValue(t: Theme, token: ColorToken, mode: 'light' | 'dark', role: Pick, part: 'fill' | 'text' | 'border'): string {
  const r = resolveColor(token, mode)
  const ink = resolveColor(t.colors.find((c) => c.id === 'textPrimary') ?? token, mode).main
  switch (role) {
    case 'none': return 'transparent'
    case 'main': return r.main
    case 'light': return r.light
    case 'dark': return r.dark
    case 'tint': return r.tint
    case 'on': return r.on
    case 'muted': return rgba(ink, part === 'fill' ? 0.12 : 0.38)
    case 'white': return '#ffffff'
    case 'black': return '#000000'
  }
  if (role.startsWith('surface:')) return t.colors.find((c) => c.id === role.slice(8))?.[mode] ?? 'transparent'
  const [id, tone] = role.split(':')
  const c = t.colors.find((x) => x.id === id)
  return c?.tones?.[tone] ?? r.main
}
/** Readable name of a pick, for the UI. */
export function pickLabel(t: Theme, role: Pick): string {
  if (role === 'on') return 'Text on'
  if (ROLES.includes(role as Role)) return role[0].toUpperCase() + role.slice(1)
  if (role === 'white') return 'White'
  if (role === 'black') return 'Black'
  if (role.startsWith('surface:')) return t.colors.find((c) => c.id === role.slice(8))?.name ?? role
  const [id, tone] = role.split(':')
  return `${t.colors.find((c) => c.id === id)?.name ?? id} ${tone}`
}
/** Roles for a button style in one mode; Dark follows Light's roles until it is given its own. */
export const rolesFor = (v: ButtonStyle, mode: 'light' | 'dark'): Record<ButtonStateId, ButtonState> => {
  if (mode !== 'dark' || !v.dark) return v.light
  return Object.fromEntries(BUTTON_STATES.map((s) => [s, { ...v.light[s], ...(v.dark![s] ?? {}) }])) as Record<ButtonStateId, ButtonState>
}

function buttonStyleCss(t: Theme, mode: 'light' | 'dark', v: ButtonStyle, token: ColorToken) {
  const roles = rolesFor(v, mode)
  const css = (st: ButtonState) => ({
    backgroundColor: roleValue(t, token, mode, st.fill, 'fill'), color: roleValue(t, token, mode, st.text, 'text'),
    borderColor: roleValue(t, token, mode, st.border, 'border'),
  })
  const ts = t.text.find((s) => s.id === v.textStyle) ?? t.text.find((s) => s.id === 'button')
  const ring = roleValue(t, token, mode, roles.focused.border, 'border')
  const lift = shadowValue(t, v.shadow) ?? 'none'
  return {
    ...(ts ? textCss(t, ts) : {}), borderRadius: radiusValue(t, v.radius) ?? '0', boxShadow: lift, borderStyle: 'solid', borderWidth: '0.0625rem',
    ...css(roles.enabled),
    '&:hover': { ...css(roles.hover), boxShadow: lift },
    '&:active': { ...css(roles.pressed), boxShadow: lift },
    '&.Mui-focusVisible': { ...css(roles.focused), borderColor: css(roles.enabled).borderColor, boxShadow: lift, outline: `0.125rem solid ${ring}`, outlineOffset: '0.125rem' },
    '&.Mui-disabled': { ...css(roles.disabled), boxShadow: 'none' },
  }
}

/** JSON-safe MUI options; also used verbatim by the code exporter. */
export function themeOptions(t: Theme, mode: 'light' | 'dark'): ThemeOptions {
  const tok = (id: string) => t.colors.find((x) => x.id === id)
  const val = (id: string) => tok(id)?.[mode] ?? '#000000'
  const body = t.text.find((x) => x.id === 'body1') ?? t.text[0]
  const main = t.fonts.find((f) => f.id === t.mainFontId) ?? t.fonts[0]
  const typography: Record<string, unknown> = { htmlFontSize: 16, fontFamily: main ? `"${main.family}", sans-serif` : body ? fam(t, body.fontId) : 'sans-serif' }
  for (const s of t.text) typography[s.id] = textCss(t, s)
  const custom: Record<string, string> = {}
  for (const col of t.colors) if (!col.core) custom[col.id] = col[mode]
  const pal = (id: string) => {
    const c = tok(id)
    if (!c) return { main: '#000000' }
    const r = resolveColor(c, mode)
    return { main: r.main, light: r.light, dark: r.dark, contrastText: r.on }
  }
  const b = t.buttons
  const btn: Record<string, unknown> = { root: { borderStyle: 'solid', borderWidth: '0.0625rem', borderColor: 'transparent' } }
  for (const [size, { y, x }] of Object.entries(b.pad)) {
    const S = size[0].toUpperCase() + size.slice(1)
    const yy = `calc(${toCss(y)} - 0.0625rem)`
    btn[`size${S}`] = { padding: `${yy} calc(${toCss(x)} - 0.0625rem)` }
    btn[`outlinedSize${S}`] = { padding: `${yy} calc(${toCss(x)} - 0.0625rem)` }
    btn[`textSize${S}`] = { padding: `${yy} calc(${toCss(Math.round(x / 2))} - 0.0625rem)` }
  }
  const variants: unknown[] = []
  for (const v of b.styles) {
    const c = tok(v.colorId) ?? tok('primary')
    if (c) variants.push({ props: { variant: v.id }, style: buttonStyleCss(t, mode, v, c) })
  }
  // library masters take the surface with their role
  const bySurface = (role: SurfaceRole) => t.colors.find((c) => c.group === 'surface' && c.role === role)?.[mode]
  const ink = val('textPrimary')
  const alert = (role: SurfaceRole) => ({ backgroundColor: bySurface(role) ?? 'transparent', color: ink })
  const dialog = bySurface('dialog')
  return {
    palette: {
      mode,
      primary: pal('primary'), secondary: pal('secondary'), error: pal('error'), warning: pal('warning'), info: pal('info'), success: pal('success'),
      background: { default: bySurface('page') ?? val('background'), paper: bySurface('card') ?? val('surface') },
      text: { primary: val('textPrimary'), secondary: val('textSecondary') }, divider: bySurface('divider') ?? val('divider'),
      custom,
    },
    shape: { borderRadius: (radiusValue(t, 'control') ?? '0') as unknown as number },
    typography,
    components: {
      MuiButton: { styleOverrides: btn, variants },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiAlert: { styleOverrides: { standardError: alert('alertError'), standardInfo: alert('alertInfo'), standardSuccess: alert('alertSuccess'), standardWarning: alert('alertWarning') } },
      MuiDialog: { styleOverrides: { paper: { backgroundColor: dialog } } },
      MuiPopover: { styleOverrides: { paper: { backgroundColor: dialog } } },
      MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: bySurface('input') } } },
    },
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
      out.push(`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, '+')}:ital,wght@0,100..900;1,100..900&display=swap');`)
    else if (f.source === 'upload' && f.file)
      out.push(`@font-face { font-family: "${f.family}"; src: url('${base ? base + f.file.name : f.file.dataUrl}'); font-weight: 100 900; font-display: swap; }`)
  }
  return out.join('\n')
}

/** Everything that differs from the built-in default, by token. Used for the "changes from default" counter and reset buttons. */
export function changedIds(t: Theme): Set<string> {
  const def = defaultThemeFull()
  const out = new Set<string>()
  const cmp = <T extends { id: string }>(kind: string, list: T[], defs: T[]) => {
    for (const x of list) { const d = defs.find((y) => y.id === x.id); if (!d || JSON.stringify(d) !== JSON.stringify(x)) out.add(`${kind}:${x.id}`) }
    for (const d of defs) if (!list.some((x) => x.id === d.id)) out.add(`${kind}:${d.id}`)
  }
  cmp('colour', t.colors, def.colors); cmp('text', t.text, def.text); cmp('radius', t.radius, def.radius); cmp('shadow', t.shadows, def.shadows)
  cmp('button', t.buttons.styles, def.buttons.styles)
  if (t.spacingUnit !== def.spacingUnit) out.add('spacing:unit')
  if (JSON.stringify(t.fonts) !== JSON.stringify(def.fonts)) out.add('fonts')
  return out
}
