import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { buildExport, parseProjectFile, projectFile } from '../export/codegen'
import { getState, getTheme, importProject, resetAll } from '../store'
import { download } from './download'

export const APP_VERSION = '0.1.0'

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<{ busy: boolean; errors: string[] }>({ busy: true, errors: [] })
  useEffect(() => {
    const s = getState()
    buildExport({ page: s.page, library: s.library, themes: s.themes, theme: getTheme(s) }).then((r) => {
      if (r.zip) download(r.zip, 'design-export.zip')
      setState({ busy: false, errors: r.errors })
    })
  }, [])
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Export code</DialogTitle>
      <DialogContent>
        {state.busy ? <Typography>Building package...</Typography> : state.errors.length ? (
          <Alert severity="error">Not compliant, nothing exported:<ul>{state.errors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>
        ) : (
          <Alert severity="success">design-export.zip downloaded. It holds the page, every library item used, the theme, tokens, fonts, project.json and a README.</Alert>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}

export function ProjectDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(localStorage.getItem('project-url') ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const apply = (text: string, from: string) => {
    const p = parseProjectFile(text)
    if (!p) return setMsg({ ok: false, text: 'Not a project file from this tool.' })
    importProject(p.library, p.themes)
    setMsg({ ok: true, text: `Imported ${p.library.length} library items and ${p.themes.length} themes from ${from}. Canvas content was kept.` })
  }
  const pull = async () => {
    try {
      localStorage.setItem('project-url', url)
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      apply(await r.text(), decodeURIComponent(url.split('/').pop() ?? url))
    } catch (e) {
      setMsg({ ok: false, text: `Could not pull the file (${(e as Error).message}). The link must be a direct file URL and the server must allow cross-origin (CORS) requests.` })
    }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Project file</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Importing replaces matching library items and themes. Anything on the canvas stays and picks up the new tokens and definitions.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => { const s = getState(); download(new Blob([projectFile({ page: s.page, library: s.library, themes: s.themes, theme: getTheme(s) })]), 'project.json') }}>Download project file</Button>
          <Button variant="outlined" onClick={() => file.current?.click()}>Upload file</Button>
          <input ref={file} type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) apply(await f.text(), f.name) }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" fullWidth label="Pull from URL (file name shows the version)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="contained" disabled={!url.trim()} onClick={pull}>Pull</Button>
        </Box>
        {msg && <Alert severity={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [usage, setUsage] = useState('')
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1048576).toFixed(1)} MB used of ${((e.quota ?? 0) / 1048576).toFixed(0)} MB available`))
  }, [])
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography>Software version: {APP_VERSION}</Typography>
        <Typography variant="body2" color="text.secondary">Browser storage: {usage || 'unknown'}</Typography>
        <Typography variant="body2" color="text.secondary">Clearing browser data erases your work. Download a project file as a backup.</Typography>
        <Button color="error" variant="outlined" onClick={async () => { if (confirm('Erase everything stored in this browser?')) { await resetAll(); onClose() } }}>Erase all local data</Button>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  )
}
