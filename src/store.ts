import { useSyncExternalStore } from 'react'
import { get, set } from 'idb-keyval'
import { cloneNew, contains, find, insertAt, parentOf, remove, setLayout, uid, update, walk } from './model/tree'
import { defaultTheme, fixTheme, isTheme, syncSurfaces, type Theme } from './model/theme'
import { KIND_RANK, type Breakpoint, type DesignNode, type Kind, type LayoutKey, type LibraryItem } from './model/types'
import { OUT_OF_BOX, oobById } from './model/library'
import { rem } from './model/rem'

export interface State {
  page: DesignNode
  library: LibraryItem[] // designer tier only; out-of-box lives in code
  themes: Theme[]
  activeThemeId: string
  mode: 'light' | 'dark'
  selection: string[] // last entry is the primary selection
  bp: Breakpoint
  view: 'design' | 'theme'
  editing: string | null // designer library item being edited
  editState: string | null // state being edited on the selected node (null = default look)
}

const p1 = { top: rem(1), right: rem(1), bottom: rem(1), left: rem(1) }
const initial = (): State => ({
  page: { id: 'page', name: 'Page', type: 'container', layout: { base: { direction: 'column', gap: rem(1), padding: p1, width: { mode: 'fill' } } } },
  library: [], themes: [defaultTheme()], activeThemeId: 'material', mode: 'light',
  selection: [], bp: 'mobile', view: 'design', editing: null, editState: null,
})

let state: State = initial()
const listeners = new Set<() => void>()
const past: Pick<State, 'page' | 'library'>[] = []
const future: Pick<State, 'page' | 'library'>[] = []
const notify = () => { listeners.forEach((l) => l()); schedulePersist() }

export const getState = () => state
export function setState(fn: (s: State) => State) {
  const prev = state
  state = fn(state)
  if (state.page !== prev.page || state.library !== prev.library) {
    past.push({ page: prev.page, library: prev.library })
    if (past.length > 100) past.shift()
    future.length = 0
  }
  notify()
}
export function undo() {
  const h = past.pop()
  if (!h) return
  future.push({ page: state.page, library: state.library })
  state = { ...state, ...h, selection: [] }
  notify()
}
export function redo() {
  const h = future.pop()
  if (!h) return
  past.push({ page: state.page, library: state.library })
  state = { ...state, ...h, selection: [] }
  notify()
}
export const useStore = <T,>(sel: (s: State) => T): T =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => sel(state))

let timer: ReturnType<typeof setTimeout> | undefined
function schedulePersist() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const { page, library, themes, activeThemeId, mode } = state
    set('canvas-state', { page, library, themes, activeThemeId, mode })
  }, 300)
}
export async function hydrate() {
  try {
    const saved = await get('canvas-state')
    if (saved) {
      state = { ...initial(), ...saved }
      // themes saved by an older version of the tool have an older shape; replace them with the default
      if (!state.themes.every(isTheme)) state = { ...state, themes: [defaultTheme()], activeThemeId: 'material' }
      else state = { ...state, themes: state.themes.map(fixTheme) }
      if (!state.themes.some((t) => t.id === state.activeThemeId)) state = { ...state, activeThemeId: state.themes[0].id }
    }
  } catch { /* start fresh */ }
}
export async function resetAll() {
  state = initial()
  past.length = 0; future.length = 0
  await set('canvas-state', undefined)
  listeners.forEach((l) => l())
}

// ---- selectors ----
export const primary = (s: State) => s.selection[s.selection.length - 1] ?? null
export const getRoot = (s: State): DesignNode =>
  (s.editing && s.library.find((i) => i.id === s.editing)?.root) || s.page
export const getTheme = (s: State) => s.themes.find((t) => t.id === s.activeThemeId) ?? s.themes[0]
export const allItems = (s: State) => [...OUT_OF_BOX, ...s.library]
export const itemById = (s: State, id: string) => allItems(s).find((i) => i.id === id)

function setRoot(s: State, root: DesignNode): State {
  if (s.editing) return { ...s, library: s.library.map((i) => (i.id === s.editing ? { ...i, root } : i)) }
  return { ...s, page: root }
}

// ---- design actions ----
export const select = (id: string | null, additive = false) =>
  setState((s) => {
    if (id === null) return { ...s, selection: [], editState: null }
    if (!additive) return { ...s, selection: [id], editState: s.selection.length === 1 && s.selection[0] === id ? s.editState : null }
    return { ...s, selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id], editState: null }
  })
export const selectMany = (ids: string[]) => setState((s) => ({ ...s, selection: ids, editState: null }))
export const setEditState = (id: string | null) => setState((s) => ({ ...s, editState: id }))

// ---- states: any node can have them ----
export function addNodeState(nodeId: string, name: string, kind: import('./model/types').StateKind): string | null {
  let err: string | null = null
  setState((s) => {
    const root = getRoot(s)
    const n = find(root, nodeId)
    if (!n) return s
    if (!name.trim()) { err = 'Name is required.'; return s }
    const taken = (n.states ?? []).map((x) => x.id)
    const base = name.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'state'
    let id = kind === 'custom' ? base : kind, i = 2
    if (kind !== 'custom' && taken.includes(kind)) { err = `This item already has a ${kind} state.`; return s }
    while (taken.includes(id)) id = `${base}-${i++}`
    return { ...setRoot(s, update(root, nodeId, (x) => ({ ...x, states: [...(x.states ?? []), { id, name: name.trim(), kind, style: {} }] }))), editState: id }
  })
  return err
}
export function updateNodeState(nodeId: string, stateId: string, fn: (st: import('./model/types').NodeState) => import('./model/types').NodeState) {
  setState((s) => setRoot(s, update(getRoot(s), nodeId, (n) => ({ ...n, states: (n.states ?? []).map((x) => (x.id === stateId ? fn(x) : x)) }))))
}
export function deleteNodeState(nodeId: string, stateId: string) {
  setState((s) => ({ ...setRoot(s, update(getRoot(s), nodeId, (n) => ({
    ...n, states: (n.states ?? []).filter((x) => x.id !== stateId),
    props: n.props?.state === stateId ? { ...n.props, state: '' } : n.props,
  }))), editState: null }))
}
export const setBp = (bp: Breakpoint) => setState((s) => ({ ...s, bp }))
export const setView = (view: State['view']) => setState((s) => ({ ...s, view }))
export const setMode = (mode: State['mode']) => setState((s) => ({ ...s, mode }))

export function updateNode(id: string, fn: (n: DesignNode) => DesignNode) {
  setState((s) => setRoot(s, update(getRoot(s), id, fn)))
}
export function setLayoutProp(id: string, key: LayoutKey, val: unknown) {
  setState((s) => setRoot(s, update(getRoot(s), id, (n) => setLayout(n, s.bp, key, val))))
}
export const resetLayoutProp = (id: string, key: LayoutKey) => setLayoutProp(id, key, undefined)

/** Rank rule: an item may only contain instances of items of a lower kind. */
export function ruleError(s: State, kind: Kind, node: DesignNode): string | null {
  let err: string | null = null
  walk(node, (n) => {
    if (n.type !== 'instance' || !n.ref) return
    const it = s.library.find((i) => i.id === n.ref)
    if (it && KIND_RANK[it.kind] >= KIND_RANK[kind])
      err = `A ${kind} can only contain items of a lower level. "${it.name}" is a ${it.kind}.`
  })
  return err
}

export function addItem(itemId: string): string | null {
  let error: string | null = null
  setState((s) => {
    const item = itemById(s, itemId)
    if (!item) return s
    const root = getRoot(s)
    const sel = primary(s) ? find(root, primary(s)!) : undefined
    const parent = sel && sel.type === 'container' ? sel : sel ? parentOf(root, sel.id) ?? root : root
    const node: DesignNode =
      item.tier === 'designer' ? { id: uid(), type: 'instance', ref: item.id, layout: { base: {} } } : cloneNew(item.root)
    if (s.editing && item.tier === 'designer') {
      const cur = s.library.find((i) => i.id === s.editing)!
      if (item.id === cur.id || KIND_RANK[item.kind] >= KIND_RANK[cur.kind]) {
        error = `A ${cur.kind} can only contain items of a lower level.`
        return s
      }
    }
    return { ...setRoot(s, update(root, parent.id, (p) => ({ ...p, children: [...(p.children ?? []), node] }))), selection: [node.id] }
  })
  return error
}

const topLevel = (root: DesignNode, ids: string[]) => ids.filter((id) => id !== root.id && !ids.some((o) => o !== id && contains(find(root, o)!, id)))

export function deleteNodes(ids: string[]) {
  setState((s) => {
    let root = getRoot(s)
    const list = topLevel(root, ids.filter((i) => find(root, i)))
    if (!list.length) return s
    for (const id of list) root = remove(root, id)
    return { ...setRoot(s, root), selection: [] }
  })
}
export function duplicateNodes(ids: string[]) {
  setState((s) => {
    let root = getRoot(s)
    const out: string[] = []
    for (const id of topLevel(root, ids.filter((i) => find(root, i)))) {
      const par = parentOf(root, id)!
      const copy = cloneNew(find(root, id)!)
      out.push(copy.id)
      root = insertAt(root, par.id, par.children!.findIndex((c) => c.id === id) + 1, [copy])
    }
    return out.length ? { ...setRoot(s, root), selection: out } : s
  })
}
export function moveNode(id: string, dir: -1 | 1) {
  setState((s) => {
    const root = getRoot(s)
    const par = parentOf(root, id)
    if (!par?.children) return s
    const i = par.children.findIndex((c) => c.id === id)
    const j = i + dir
    if (j < 0 || j >= par.children.length) return s
    const kids = [...par.children]
    ;[kids[i], kids[j]] = [kids[j], kids[i]]
    return setRoot(s, update(root, par.id, (p) => ({ ...p, children: kids })))
  })
}
/** Drag and drop in the layers panel. */
export function moveTo(ids: string[], targetId: string, pos: 'before' | 'after' | 'inside') {
  setState((s) => {
    let root = getRoot(s)
    const list = topLevel(root, ids.filter((i) => find(root, i)))
    if (!list.length || list.includes(targetId) || list.some((id) => contains(find(root, id)!, targetId))) return s
    const nodes = list.map((id) => find(root, id)!)
    for (const id of list) root = remove(root, id)
    const target = find(root, targetId)
    if (!target) return s
    if (pos === 'inside') {
      if (target.type !== 'container') return s
      root = insertAt(root, target.id, -1, nodes)
    } else {
      const par = parentOf(root, targetId)
      if (!par) return s
      const idx = par.children!.findIndex((c) => c.id === targetId) + (pos === 'after' ? 1 : 0)
      root = insertAt(root, par.id, idx, nodes)
    }
    return { ...setRoot(s, root), selection: list }
  })
}
/** Group the selection into a new auto-layout container (Ctrl+G). */
export function wrapNodes(ids: string[]) {
  setState((s) => {
    let root = getRoot(s)
    const list = topLevel(root, ids.filter((i) => find(root, i)))
    if (!list.length) return s
    const first = list[0]
    const par = parentOf(root, first)!
    const kids = par.children!
    // keep document order when siblings, else selection order
    const ordered = list.every((id) => kids.some((c) => c.id === id)) ? kids.filter((c) => list.includes(c.id)) : list.map((id) => find(root, id)!)
    const idx = kids.findIndex((c) => c.id === first)
    const wrapper: DesignNode = { id: uid(), type: 'container', layout: { base: { direction: 'column' } }, children: ordered }
    for (const n of ordered) root = remove(root, n.id)
    root = insertAt(root, par.id, Math.min(idx, (find(root, par.id)!.children?.length ?? 0)), [wrapper])
    return { ...setRoot(s, root), selection: [wrapper.id] }
  })
}
export function ungroup(id: string) {
  setState((s) => {
    const root = getRoot(s)
    const n = find(root, id)
    const par = parentOf(root, id)
    if (!n || n.type !== 'container' || !par?.children?.length && !n.children) return s
    const idx = par!.children!.findIndex((c) => c.id === id)
    const kids = n.children ?? []
    const next = insertAt(remove(root, id), par!.id, idx, kids)
    return { ...setRoot(s, next), selection: kids.map((k) => k.id) }
  })
}

export function saveAsNew(nodeId: string, name: string, kind: Kind): string | null {
  let error: string | null = null
  setState((s) => {
    const root = getRoot(s)
    const n = find(root, nodeId)
    if (!n) return s
    if (!name.trim()) { error = 'Name is required.'; return s }
    const copy = cloneNew(n)
    error = ruleError(s, kind, copy)
    if (error) return s
    const item: LibraryItem = { id: uid(), name: name.trim(), kind, tier: 'designer', derivedFrom: n.type === 'instance' ? n.ref : undefined, root: copy }
    let next = { ...s, library: [...s.library, item] }
    if (n.id !== root.id) {
      const inst: DesignNode = { id: uid(), type: 'instance', ref: item.id, layout: { base: {} } }
      const par = parentOf(root, n.id)!
      const idx = par.children!.findIndex((c) => c.id === n.id)
      next = { ...setRoot(next, insertAt(remove(root, n.id), par.id, idx, [inst])), selection: [inst.id] }
    }
    return next
  })
  return error
}
export const editDefinition = (id: string | null) => setState((s) => ({ ...s, editing: id, selection: [], view: 'design' }))
export const deleteLibraryItem = (id: string) =>
  setState((s) => ({ ...s, library: s.library.filter((i) => i.id !== id), editing: s.editing === id ? null : s.editing }))
export const renameLibraryItem = (id: string, name: string) =>
  setState((s) => ({ ...s, library: s.library.map((i) => (i.id === id ? { ...i, name } : i)) }))

// ---- theme actions ----
export const updateTheme = (fn: (t: Theme) => Theme) =>
  setState((s) => ({ ...s, themes: s.themes.map((t) => (t.id === s.activeThemeId ? syncSurfaces(fn(t)) : t)) }))
export const setActiveTheme = (id: string) => setState((s) => ({ ...s, activeThemeId: id }))
export function newTheme(name: string) {
  setState((s) => {
    const t: Theme = { ...structuredClone(getTheme(s)), id: uid(), name }
    return { ...s, themes: [...s.themes, t], activeThemeId: t.id }
  })
}
export const renameTheme = (name: string) => updateTheme((t) => ({ ...t, name }))
export function deleteTheme() {
  setState((s) => {
    if (s.themes.length < 2) return s
    const themes = s.themes.filter((t) => t.id !== s.activeThemeId)
    return { ...s, themes, activeThemeId: themes[0].id }
  })
}
export function importTheme(theme: Theme) {
  const t = fixTheme(theme)
  setState((s) => ({
    ...s,
    themes: s.themes.some((x) => x.id === t.id) ? s.themes.map((x) => (x.id === t.id ? t : x)) : [...s.themes, t],
    activeThemeId: t.id,
  }))
}
/** Project import: theme tokens and designer library items replace matching ones. The canvas is untouched. */
export function importProject(items: LibraryItem[], themes: Theme[]) {
  setState((s) => {
    const lib = [...s.library]
    for (const it of items) {
      const i = lib.findIndex((x) => x.id === it.id)
      if (i >= 0) lib[i] = it
      else lib.push(it)
    }
    const th = [...s.themes]
    for (const t of themes.filter(isTheme).map(fixTheme)) {
      const i = th.findIndex((x) => x.id === t.id)
      if (i >= 0) th[i] = t
      else th.push(t)
    }
    return { ...s, library: lib, themes: th }
  })
}
export { oobById }

// dev-only handle used by automated visual checks
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__canvas = { addNodeState, updateNodeState, deleteNodeState, setEditState, getState, setState, addItem, select, updateNode, setLayoutProp, updateTheme, setView, setBp, setMode }
