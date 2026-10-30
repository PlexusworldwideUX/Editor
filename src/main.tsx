import { createRoot } from 'react-dom/client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CssBaseline from '@mui/material/CssBaseline'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { buildMuiTheme, fontCss } from './model/theme'
import { DEVICE_PX, BREAKPOINTS } from './model/types'
import { Render, RenderCtx } from './render/Render'
import {
  deleteNodes, duplicateNodes, editDefinition, getRoot, getTheme, hydrate, redo, select, selectMany, setBp, setMode, setView, undo, ungroup,
  useStore, wrapNodes,
} from './store'
import { LeftPanel } from './ui/LeftPanel'
import { Properties } from './ui/Properties'
import { ThemePanel } from './ui/ThemePanel'
import { KitchenSink } from './ui/KitchenSink'
import { ExportDialog, ProjectDialog, SettingsDialog } from './ui/Dialogs'

const chrome = createTheme({ typography: { fontSize: 13 }, palette: { primary: { main: '#0b57d0' } } })

function FontLoader() {
  const theme = useStore(getTheme)
  const css = fontCss(theme)
  useEffect(() => {
    let el = document.getElementById('design-fonts') as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = 'design-fonts'; document.head.appendChild(el) }
    el.textContent = css
  }, [css])
  return null
}

function Canvas() {
  const root = useStore(getRoot)
  const theme = useStore(getTheme)
  const library = useStore((s) => s.library)
  const selection = useStore((s) => s.selection)
  const editState = useStore((s) => s.editState)
  const bp = useStore((s) => s.bp)
  const mode = useStore((s) => s.mode)
  const view = useStore((s) => s.view)
  const muiTheme = useMemo(() => buildMuiTheme(theme, mode), [theme, mode])
  // The frame is always laid out at its true device width so tablet/desktop rules apply; zoom only scales it to fit the window.
  const area = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(0)
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvail(el.clientWidth))
    ro.observe(el)
    setAvail(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const zoom = view === 'theme' || !avail ? 1 : Math.min(1, (avail - 48) / DEVICE_PX[bp])
  const ctx = useMemo(() => ({ theme, library, editor: { selection, onSelect: select, editState } }), [theme, library, selection, editState])
  return (
    <ThemeProvider theme={muiTheme}>
      <Box ref={area} onClick={() => select(null)} sx={{ flex: 1, overflow: 'auto', bgcolor: '#e8eaed', p: 3, position: 'relative' }}>
        {view === 'design' && <Typography variant="caption" sx={{ position: 'absolute', right: '1rem', bottom: '0.5rem', color: 'text.secondary' }}>{DEVICE_PX[bp]} wide, shown at {Math.round(zoom * 100)}%</Typography>}
        {/* The device frame width is the only pixel value in the app. */}
        <Box sx={{ width: view === 'theme' ? '100%' : DEVICE_PX[bp], flexShrink: 0, zoom, mx: 'auto', bgcolor: 'background.default', color: 'text.primary', containerType: 'inline-size', minHeight: '25rem', boxShadow: 1 }}>
          {view === 'theme' ? <KitchenSink theme={theme} mode={mode} /> : (
            <RenderCtx.Provider value={ctx}><Render node={root} /></RenderCtx.Provider>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  )
}

function Shortcuts() {
  const root = useStore(getRoot)
  const selection = useStore((s) => s.selection)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable], .MuiDialog-root')) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      else if (mod && k === 'y') { e.preventDefault(); redo() }
      else if (mod && k === 'a') { e.preventDefault(); selectMany((root.children ?? []).map((c) => c.id)) }
      else if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? selection[0] && ungroup(selection[0]) : wrapNodes(selection) }
      else if (mod && k === 'd') { e.preventDefault(); duplicateNodes(selection) }
      else if (k === 'delete' || k === 'backspace') { if (selection.length) { e.preventDefault(); deleteNodes(selection) } }
      else if (k === 'escape') select(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [root, selection])
  return null
}

function App() {
  const bp = useStore((s) => s.bp)
  const view = useStore((s) => s.view)
  const mode = useStore((s) => s.mode)
  const editing = useStore((s) => s.editing)
  const lib = useStore((s) => s.library)
  const [dlg, setDlg] = useState<null | 'export' | 'project' | 'settings'>(null)
  const editName = lib.find((i) => i.id === editing)?.name
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderBottom: '0.0625rem solid', borderColor: 'divider', bgcolor: 'background.paper', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Canvas</Typography>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="design">Design</ToggleButton>
          <ToggleButton value="theme">Theme</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={bp} disabled={view === 'theme'} onChange={(_, v) => v && setBp(v)}>
          {BREAKPOINTS.map((b) => <ToggleButton key={b} value={b} sx={{ textTransform: 'none' }}>{b} {DEVICE_PX[b]}</ToggleButton>)}
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
        {editName && <Button size="small" color="warning" variant="contained" onClick={() => editDefinition(null)}>Editing "{editName}": Done</Button>}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={() => setDlg('project')}>Project file</Button>
        <Button size="small" onClick={() => setDlg('settings')}>Settings</Button>
        <Button size="small" variant="contained" onClick={() => setDlg('export')}>Export code</Button>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftPanel />
        <Canvas />
        <Box sx={{ width: '28rem', borderLeft: '0.0625rem solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
          {view === 'theme' ? <ThemePanel /> : <Properties />}
        </Box>
      </Box>
      {dlg === 'export' && <ExportDialog onClose={() => setDlg(null)} />}
      {dlg === 'project' && <ProjectDialog onClose={() => setDlg(null)} />}
      {dlg === 'settings' && <SettingsDialog onClose={() => setDlg(null)} />}
      <FontLoader />
      <Shortcuts />
    </Box>
  )
}

hydrate().then(() =>
  createRoot(document.getElementById('root')!).render(
    <ThemeProvider theme={chrome}><CssBaseline /><App /></ThemeProvider>,
  ),
)
