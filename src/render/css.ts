import { toCss } from '../model/rem'
import { effLayout } from '../model/tree'
import { BREAKPOINT_REM, type Align3, type DesignNode, type LayoutProps, type NodeState, type NodeStyle, type Sizing } from '../model/types'

type Css = Record<string, string>
const J: Record<Align3, string> = { start: 'flex-start', center: 'center', end: 'flex-end' }
const dirOf = (n?: DesignNode, bp: 'mobile' | 'tablet' | 'desktop' = 'mobile') =>
  (n ? effLayout(n, bp).direction : undefined) ?? 'column'

const dim = (s: Sizing | undefined) => (s?.mode === 'fixed' ? toCss(s.value) : s?.mode === 'hug' ? 'fit-content' : 'auto')

/** Full (non-diffed) CSS for a node at one breakpoint. */
function full(n: DesignNode, parent: DesignNode | undefined, bp: 'mobile' | 'tablet' | 'desktop'): Css {
  const l: LayoutProps = effLayout(n, bp)
  const css: Css = {
    width: dim(l.width), height: dim(l.height), flex: '0 1 auto', minWidth: 'auto', minHeight: 'auto', alignSelf: 'auto', maxWidth: 'none', textAlign: 'inherit',
  }
  if (l.width?.mode === 'fixed') css.maxWidth = '100%' // never wider than the container
  if (n.type !== 'icon' && n.type !== 'button') css.textAlign = l.textAlign ?? 'inherit'
  const pRow = dirOf(parent, bp) === 'row'
  const [mainS, crossS, mainDim, crossDim, mainMin] = pRow
    ? [l.width, l.height, 'width', 'height', 'minWidth']
    : [l.height, l.width, 'height', 'width', 'minHeight']
  if (!parent) {
    if (l.width?.mode === 'fill') css.width = '100%'
  } else {
    if (mainS?.mode === 'fill') { css.flex = '1 1 0'; css[mainDim] = 'auto'; css[mainMin] = '0' }
    else if (mainS && mainS.mode !== 'auto') css.flex = '0 0 auto'
    if (crossS?.mode === 'fill') { css.alignSelf = 'stretch'; css[crossDim] = 'auto' }
  }
  if (l.selfAlign && css.alignSelf === 'auto' && l.selfAlign !== 'auto') css.alignSelf = l.selfAlign === 'stretch' ? 'stretch' : J[l.selfAlign]
  if (n.type === 'container') {
    const row = (l.direction ?? 'column') === 'row'
    const main = (row ? l.alignX : l.alignY) ?? 'start'
    const cross = (row ? l.alignY : l.alignX) ?? 'start'
    css.display = 'flex'
    css.flexDirection = l.direction ?? 'column'
    css.flexWrap = l.wrap ? 'wrap' : 'nowrap'
    const gx = l.gapX ?? l.gap
    const gy = l.gapY ?? l.gap
    const mainGap = row ? gx : gy
    const crossGap = row ? gy : gx
    css.justifyContent = mainGap === 'auto' ? 'space-between' : J[main]
    // Auto on the other gap spreads wrapped lines apart (needs a container taller than its content)
    css.alignContent = crossGap === 'auto' ? 'space-between' : 'normal'
    css.alignItems = J[cross]
    css.columnGap = typeof gx === 'number' ? toCss(gx) : '0'
    css.rowGap = typeof gy === 'number' ? toCss(gy) : '0'
    const p = l.padding
    css.padding = p ? `${toCss(p.top)} ${toCss(p.right)} ${toCss(p.bottom)} ${toCss(p.left)}` : '0'
    css.overflow = l.clip ? 'hidden' : 'visible'
  }
  return css
}

const DEFAULTS: Css = {
  width: 'auto', height: 'auto', flex: '0 1 auto', minWidth: 'auto', minHeight: 'auto', alignSelf: 'auto', maxWidth: 'none', textAlign: 'inherit',
  columnGap: '0', rowGap: '0', alignContent: 'normal', padding: '0', overflow: 'visible', flexWrap: 'nowrap',
}

/** `byMode` returns a value that picks light or dark from the active MUI theme (a function in sx; the same function in exported code). */
export interface Resolver { radius: (token: string) => string | undefined; shadow: (token: string, drop: boolean) => string | undefined; byMode: (light: string, dark: string) => unknown }
export const MARK = {
  byMode: (l: string, d: string) => `@@(theme: Theme) => (theme.palette.mode === 'dark' ? ${JSON.stringify(d)} : ${JSON.stringify(l)})@@`,
  radius: (t: string) => `@@tokens.radius[${JSON.stringify(t)}]@@`,
  shadow: (t: string, drop: boolean) => `@@tokens.${drop ? 'dropShadow' : 'shadow'}[${JSON.stringify(t)}]@@`,
}

/**
 * Responsive CSS for a node: mobile base plus diffs inside rem container queries.
 * Shared by the canvas renderer and the code exporter so both match exactly.
 */
export function nodeCss(n: DesignNode, parent: DesignNode | undefined, r: Resolver): Record<string, unknown> {
  const out: Record<string, unknown> = { boxSizing: 'border-box' }
  const base = full(n, parent, 'mobile')
  for (const [k, v] of Object.entries(base)) if (DEFAULTS[k] !== v) out[k] = v
  let prev = base
  for (const bp of ['tablet', 'desktop'] as const) {
    const cur = full(n, parent, bp)
    const diff: Css = {}
    for (const [k, v] of Object.entries(cur)) if (prev[k] !== v) diff[k] = v
    if (Object.keys(diff).length) out[`@container (min-width: ${BREAKPOINT_REM[bp]}rem)`] = diff
    prev = cur
  }
  Object.assign(out, styleCss(n, n.style, n.style, r))
  // states come last so they win over the base look
  for (const st of n.states ?? []) {
    const css = styleCss(n, st.style, { ...n.style, ...st.style }, r, true)
    if (Object.keys(css).length) out[STATE_SELECTOR(st)] = css
  }
  return out
}

export const STATE_SELECTOR = (st: NodeState) =>
  st.kind === 'hover' ? '&:hover'
    : st.kind === 'pressed' ? '&:active'
      : st.kind === 'focus' ? '&:focus-visible, &.Mui-focusVisible'
        : st.kind === 'disabled' ? '&:disabled, &.Mui-disabled, &[aria-disabled="true"]'
          : `&[data-state="${st.id}"]`

/** Style tokens to CSS. `own` is what this style sets; `merged` is the effective style (used to decide fill vs drop shadow). */
export function styleCss(n: DesignNode, own: NodeStyle | undefined, merged: NodeStyle | undefined, r: Resolver, isState = false): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!own) return out
  const pick = (light: string | undefined, dark: string | undefined, fallback?: string) =>
    light || dark ? (dark && dark !== (light ?? fallback) ? r.byMode(light ?? fallback ?? dark, dark) : (light ?? dark)) : undefined
  const fill = pick(own.fill, own.fillDark, merged?.fill)
  if (fill) out.backgroundColor = fill
  const text = pick(own.color, own.colorDark, merged?.color)
  if (text) out.color = text
  if (own.radius) out.borderRadius = r.radius(own.radius)
  if (own.opacity !== undefined) out.opacity = own.opacity
  if (own.shadow) {
    // box-shadow only paints outside the box, so unfilled nodes use a filter that follows their content
    const filled = !!merged?.fill || (n.type === 'button' && n.props?.variant !== 'text')
    if (filled) out.boxShadow = r.shadow(own.shadow, false)
    else out.filter = r.shadow(own.shadow, true)
  }
  if (own.borderWidth !== undefined || (isState && own.borderColor)) {
    const w = merged?.borderWidth ?? own.borderWidth
    if (own.borderWidth !== undefined) out.border = `${w ? toCss(w) : '0'} solid`
    out.borderColor = pick(merged?.borderColor ?? 'divider', merged?.borderColorDark) ?? 'divider'
  } else if ((own.borderColor || own.borderColorDark) && merged?.borderWidth) out.borderColor = pick(own.borderColor, own.borderColorDark, merged?.borderColor ?? 'divider')
  return out
}
