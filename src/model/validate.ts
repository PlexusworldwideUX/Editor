import type { DesignNode, LayoutProps } from './types'

const isTick = (n: unknown) => typeof n === 'number' && Number.isInteger(n)

function checkLayout(l: LayoutProps, path: string, out: string[]) {
  for (const k of ['gap', 'gapX', 'gapY'] as const) if (l[k] !== undefined && l[k] !== 'auto' && !isTick(l[k])) out.push(`${path}: ${k} off scale`)
  if (l.padding) for (const [k, v] of Object.entries(l.padding)) if (!isTick(v)) out.push(`${path}: padding.${k} off scale`)
  for (const k of ['width', 'height'] as const) {
    const s = l[k]
    if (s?.mode === 'fixed' && !isTick(s.value)) out.push(`${path}: ${k} off scale`)
  }
}

/** Returns a list of compliance errors; empty means exportable. */
export function validate(node: DesignNode, path = node.id, out: string[] = []): string[] {
  checkLayout(node.layout.base, `${path}.base`, out)
  for (const bp of ['tablet', 'desktop'] as const) {
    const l = node.layout[bp]
    if (l) checkLayout(l, `${path}.${bp}`, out)
  }
  if (node.style?.borderWidth !== undefined && !isTick(node.style.borderWidth)) out.push(`${path}: border off scale`)
  if (node.type === 'icon' && node.props?.size !== undefined && !isTick(node.props.size)) out.push(`${path}: icon size off scale`)
  node.children?.forEach((c) => validate(c, `${path}/${c.id}`, out))
  return out
}
