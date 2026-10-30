import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'
import Delete from '@mui/icons-material/Delete'
import ContentCopy from '@mui/icons-material/ContentCopy'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import CropFree from '@mui/icons-material/CropFree'
import Edit from '@mui/icons-material/Edit'
import ChevronRight from '@mui/icons-material/ChevronRight'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Undo from '@mui/icons-material/Undo'
import Redo from '@mui/icons-material/Redo'
import {
  addItem, allItems, deleteLibraryItem, deleteNodes, duplicateNodes, editDefinition, getRoot, getTheme, moveNode, moveTo,
  redo, renameLibraryItem, select, undo, ungroup, useStore, wrapNodes,
} from '../store'
import { buildMuiTheme } from '../model/theme'
import { parentOf, walk } from '../model/tree'
import { KINDS, type DesignNode, type LibraryItem } from '../model/types'
import { Render, RenderCtx } from '../render/Render'

const additive = (e: React.MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey
let dragIds: string[] = []

type Drop = { id: string; pos: 'before' | 'after' | 'inside' } | null
function Row({ n, depth, lib, drop, setDrop, collapsed, toggle }: { n: DesignNode; depth: number; lib: LibraryItem[]; drop: Drop; setDrop: (d: Drop) => void; collapsed: Set<string>; toggle: (id: string) => void }) {
  const selection = useStore((s) => s.selection)
  const root = useStore(getRoot)
  const name = n.type === 'instance' ? lib.find((i) => i.id === n.ref)?.name ?? 'Missing item' : n.name ?? (n.type === 'icon' ? `Icon ${n.props?.icon ?? ''}` : n.type === 'container' ? 'Container' : String(n.props?.text ?? n.props?.label ?? n.props?.alt ?? n.type))
  const isRoot = n.id === root.id
  const mine = drop?.id === n.id ? drop.pos : null
  const hasKids = !!n.children?.length
  const closed = collapsed.has(n.id)
  return (
    <>
      <Box draggable={!isRoot} onClick={(e) => { e.stopPropagation(); select(n.id, additive(e)) }}
        onDragStart={() => { dragIds = selection.includes(n.id) ? selection : [n.id] }}
        onDragOver={(e) => {
          e.preventDefault()
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const y = (e.clientY - r.top) / r.height
          const pos = n.type === 'container' && y > 0.25 && y < 0.75 ? 'inside' : isRoot ? 'inside' : y < 0.5 ? 'before' : 'after'
          setDrop({ id: n.id, pos })
        }}
        onDrop={(e) => { e.preventDefault(); if (mine) moveTo(dragIds, n.id, mine); setDrop(null) }}
        sx={{
          pl: depth * 1.5 + 0.5, pr: 1, py: 0.5, cursor: 'pointer', display: 'flex', gap: 1, alignItems: 'center',
          bgcolor: selection.includes(n.id) ? 'action.selected' : mine === 'inside' ? 'action.focus' : undefined,
          borderTop: mine === 'before' ? '0.125rem solid #0b57d0' : '0.125rem solid transparent',
          borderBottom: mine === 'after' ? '0.125rem solid #0b57d0' : '0.125rem solid transparent',
          '&:hover': { bgcolor: 'action.hover' },
        }}>
        <Box onClick={(e) => { e.stopPropagation(); if (hasKids) toggle(n.id) }} aria-label={closed ? 'expand' : 'collapse'}
          sx={{ width: '1.25rem', height: '1.25rem', display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 0.5, '&:hover': hasKids ? { bgcolor: 'action.selected' } : undefined }}>
          {hasKids && (closed ? <ChevronRight sx={{ fontSize: '1.125rem' }} /> : <ExpandMore sx={{ fontSize: '1.125rem' }} />)}
        </Box>
        <Typography variant="body2" noWrap sx={{ flex: 1 }}>{name}</Typography>
        {closed && <Typography variant="caption" color="text.secondary">{n.children!.length}</Typography>}
        <Typography variant="caption" color="text.secondary">{n.type}</Typography>
      </Box>
      {!closed && n.children?.map((c) => <Row key={c.id} n={c} depth={depth + 1} lib={lib} drop={drop} setDrop={setDrop} collapsed={collapsed} toggle={toggle} />)}
    </>
  )
}

function Layers() {
  const root = useStore(getRoot)
  const lib = useStore((s) => s.library)
  const sel = useStore((s) => s.selection)
  const [drop, setDrop] = useState<Drop>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed((c) => { const x = new Set(c); x.has(id) ? x.delete(id) : x.add(id); return x })
  const parents = () => { const ids: string[] = []; walk(root, (n) => { if (n.children?.length) ids.push(n.id) }); return ids }
  // selecting something on the canvas reveals it in the tree
  useEffect(() => {
    const id = sel[sel.length - 1]
    if (!id) return
    const open: string[] = []
    for (let p = parentOf(root, id); p; p = parentOf(root, p.id)) open.push(p.id)
    if (open.some((x) => collapsed.has(x))) setCollapsed((c) => { const x = new Set(c); open.forEach((o) => x.delete(o)); return x })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel])
  const off = !sel.length
  const rootSel = sel.includes(root.id)
  const one = sel.length === 1 ? sel[0] : null
  const btn = (title: string, icon: React.ReactNode, fn: () => void, disabled = false) => (
    <Tooltip title={title}><span><IconButton size="small" disabled={disabled} onClick={fn}>{icon}</IconButton></span></Tooltip>
  )
  return (
    <>
      <Box sx={{ display: 'flex', px: 1, borderBottom: '0.0625rem solid', borderColor: 'divider', flexWrap: 'wrap' }}>
        {btn('Undo (Ctrl+Z)', <Undo fontSize="small" />, undo)}
        {btn('Redo (Ctrl+Shift+Z)', <Redo fontSize="small" />, redo)}
        {btn('Move up', <ArrowUpward fontSize="small" />, () => one && moveNode(one, -1), !one || rootSel)}
        {btn('Move down', <ArrowDownward fontSize="small" />, () => one && moveNode(one, 1), !one || rootSel)}
        {btn('Group in container (Ctrl+G)', <CropFree fontSize="small" />, () => wrapNodes(sel), off || rootSel)}
        {btn('Duplicate (Ctrl+D)', <ContentCopy fontSize="small" />, () => duplicateNodes(sel), off || rootSel)}
        {btn('Delete', <Delete fontSize="small" />, () => deleteNodes(sel), off || rootSel)}
        {one && root.id !== one && <Tooltip title="Ungroup (Ctrl+Shift+G)"><span><IconButton size="small" onClick={() => ungroup(one)}><Typography variant="caption">Ungroup</Typography></IconButton></span></Tooltip>}
      </Box>
      <Box sx={{ px: 1, pt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Shift-click to multi-select. Drag rows to reorder or nest.</Typography>
        <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }} onClick={() => setCollapsed(new Set(parents().filter((i) => i !== root.id)))}>Collapse all</Typography>
        <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }} onClick={() => setCollapsed(new Set())}>Expand all</Typography>
      </Box>
      <Box sx={{ overflow: 'auto', flex: 1 }} onDragLeave={() => setDrop(null)} onClick={() => select(null)}>
        <Row n={root} depth={0} lib={lib} drop={drop} setDrop={setDrop} collapsed={collapsed} toggle={toggle} />
      </Box>
    </>
  )
}

/** Scaled live preview of a library item, rendered with the active theme. */
/** Fits a live render of the item into the thumbnail cell, centred and scaled down when large. */
function Preview({ node, ctx }: { node: DesignNode; ctx: { theme: ReturnType<typeof getTheme>; library: LibraryItem[]; thumb: boolean } }) {
  const cell = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      if (!cell.current || !inner.current) return
      const pad = 12
      const sx = (cell.current.clientWidth - pad) / inner.current.offsetWidth
      const sy = (cell.current.clientHeight - pad) / inner.current.offsetHeight
      setScale(Math.min(1, sx, sy))
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (inner.current) ro.observe(inner.current)
    return () => ro.disconnect()
  }, [node])
  return (
    <Box ref={cell} sx={{ height: '6.5rem', overflow: 'hidden', bgcolor: 'background.default', position: 'relative' }}>
      <Box ref={inner} sx={{
        position: 'absolute', left: '50%', top: '50%', width: 'max-content', minWidth: '8rem', maxWidth: '24rem', pointerEvents: 'none',
        transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center', containerType: 'inline-size',
      }}>
        <RenderCtx.Provider value={ctx}><Render node={{ ...node, id: `thumb-${node.id}` }} /></RenderCtx.Provider>
      </Box>
    </Box>
  )
}

function Card({ item, onAdd, children }: { item: LibraryItem; onAdd: () => void; children?: React.ReactNode }) {
  const theme = useStore(getTheme)
  const library = useStore((s) => s.library)
  const ctx = useMemo(() => ({ theme, library, thumb: true }), [theme, library])
  return (
    <Box sx={{ border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
      <Box onClick={onAdd}><Preview node={item.root} ctx={ctx} /></Box>
      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'background.paper', borderTop: '0.0625rem solid', borderColor: 'divider' }}>
        <Typography variant="caption" noWrap sx={{ flex: 1 }} title={item.name}>{item.name}</Typography>
        {children}
      </Box>
    </Box>
  )
}

function Library() {
  const library = useStore((s) => s.library)
  const theme = useStore(getTheme)
  const mode = useStore((s) => s.mode)
  const state = useStore((s) => s)
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'out-of-box' | 'designer'>('out-of-box')
  const muiTheme = useMemo(() => buildMuiTheme(theme, mode), [theme, mode])
  const items = allItems(state).filter((i) => i.tier === tab && i.name.toLowerCase().includes(q.toLowerCase()))
  const add = (id: string) => { const e = addItem(id); if (e) setMsg(e) }
  void library
  return (
    <Box sx={{ overflow: 'auto', flex: 1 }}>
      {/* sticky so search and tabs stay visible while the list scrolls */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 3, bgcolor: 'background.paper', p: 1, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
        <TextField size="small" fullWidth placeholder="Search library" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 1 }} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 0 }}>
          <Tab value="out-of-box" label="Out of box" sx={{ minHeight: 0, py: 1 }} />
          <Tab value="designer" label="Designer" sx={{ minHeight: 0, py: 1 }} />
        </Tabs>
      </Box>
      <Box sx={{ p: 1 }}>
      <ThemeProvider theme={muiTheme}>
        {KINDS.map((kind) => {
          const list = items.filter((i) => i.kind === kind)
          if (!list.length) return null
          return (
            <Box key={kind} sx={{ mb: 2 }}>
              <Typography variant="overline" color="text.secondary">{kind}s</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {list.map((i) => (
                  <Card key={i.id} item={i} onAdd={() => add(i.id)}>
                    {i.tier === 'designer' && (
                      <>
                        <Tooltip title="Edit definition"><IconButton size="small" onClick={() => editDefinition(i.id)}><Edit sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                        <Tooltip title="Rename"><IconButton size="small" onClick={() => { const n = prompt('Name', i.name); if (n) renameLibraryItem(i.id, n) }}><Typography sx={{ fontSize: '0.75rem' }}>Aa</Typography></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => confirm(`Delete "${i.name}"?`) && deleteLibraryItem(i.id)}><Delete sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                      </>
                    )}
                  </Card>
                ))}
              </Box>
            </Box>
          )
        })}
      </ThemeProvider>
      {tab === 'designer' && !items.length && (
        <Typography variant="caption" color="text.secondary">
          Nothing yet. Select something on the canvas and choose "Save as new" in the properties panel.
        </Typography>
      )}
      </Box>
      <Snackbar open={!!msg} autoHideDuration={5000} onClose={() => setMsg('')} message={msg} />
    </Box>
  )
}

export function LeftPanel() {
  const [tab, setTab] = useState(0)
  return (
    <Box sx={{ width: '18rem', borderRight: '0.0625rem solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Layers" /><Tab label="Library" />
      </Tabs>
      {tab === 0 ? <Layers /> : <Library />}
    </Box>
  )
}
