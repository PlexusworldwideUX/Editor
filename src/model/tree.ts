import type { Breakpoint, DesignNode, LayoutKey, LayoutProps } from './types'

export const uid = () => Math.random().toString(36).slice(2, 9)

export function find(n: DesignNode, id: string): DesignNode | undefined {
  if (n.id === id) return n
  for (const c of n.children ?? []) {
    const r = find(c, id)
    if (r) return r
  }
}
export function parentOf(n: DesignNode, id: string): DesignNode | undefined {
  for (const c of n.children ?? []) {
    if (c.id === id) return n
    const r = parentOf(c, id)
    if (r) return r
  }
}
export function update(n: DesignNode, id: string, fn: (n: DesignNode) => DesignNode): DesignNode {
  if (n.id === id) return fn(n)
  if (!n.children) return n
  return { ...n, children: n.children.map((c) => update(c, id, fn)) }
}
export function remove(n: DesignNode, id: string): DesignNode {
  if (!n.children) return n
  return { ...n, children: n.children.filter((c) => c.id !== id).map((c) => remove(c, id)) }
}
export function cloneNew(n: DesignNode): DesignNode {
  const copy = structuredClone(n)
  const walk = (x: DesignNode) => {
    x.id = uid()
    x.children?.forEach(walk)
  }
  walk(copy)
  return copy
}
export function walk(n: DesignNode, fn: (n: DesignNode) => void) {
  fn(n)
  n.children?.forEach((c) => walk(c, fn))
}

const LAYERS: Record<Breakpoint, ('base' | 'tablet' | 'desktop')[]> = {
  mobile: ['base'],
  tablet: ['base', 'tablet'],
  desktop: ['base', 'desktop'], // tablet and desktop are siblings: each follows mobile, never each other
}
/** Effective layout at a breakpoint: mobile base plus that breakpoint's own values. */
export function effLayout(n: DesignNode, bp: Breakpoint): LayoutProps {
  return LAYERS[bp].reduce<LayoutProps>((acc, k) => ({ ...acc, ...(n.layout[k] ?? {}) }), {})
}
export const layerOf = (bp: Breakpoint) => (bp === 'mobile' ? 'base' : bp)

export function setLayout(n: DesignNode, bp: Breakpoint, key: LayoutKey, val: unknown): DesignNode {
  const layer = layerOf(bp)
  const l: Record<string, unknown> = { ...(n.layout[layer] ?? {}) }
  if (val === undefined) delete l[key]
  else l[key] = val
  const layout = { ...n.layout, [layer]: l } as DesignNode['layout']
  if (layer !== 'base' && Object.keys(l).length === 0) delete layout[layer]
  return { ...n, layout }
}
export const isOverridden = (n: DesignNode, bp: Breakpoint, key: LayoutKey) =>
  bp !== 'mobile' && n.layout[bp] !== undefined && key in (n.layout[bp] as object)

export function insertAt(n: DesignNode, parentId: string, index: number, nodes: DesignNode[]): DesignNode {
  return update(n, parentId, (p) => {
    const kids = [...(p.children ?? [])]
    kids.splice(index < 0 ? kids.length : index, 0, ...nodes)
    return { ...p, children: kids }
  })
}
export const contains = (n: DesignNode, id: string) => !!find(n, id)
