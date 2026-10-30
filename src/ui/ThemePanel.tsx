import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { deleteTheme, getTheme, importTheme, newTheme, renameTheme, setActiveTheme, setMode, useStore } from '../store'
import { changedIds } from '../model/theme'
import { parseThemeFile, themeFileSource } from '../export/codegen'
import { download } from './download'
import { FoldCtx } from './theme/common'
import { ColoursSection, SurfacesSection } from './theme/Colours'
import { FontsSection, TextStylesSection } from './theme/Typography'
import { RadiusSection, ShadowsSection, SpacingSection } from './theme/Tokens'
import { ButtonsSection } from './theme/Buttons'
import LightMode from '@mui/icons-material/LightMode'
import DarkMode from '@mui/icons-material/DarkMode'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

export function ThemePanel() {
  const themes = useStore((s) => s.themes)
  const t = useStore(getTheme)
  const mode = useStore((s) => s.mode)
  const [msg, setMsg] = useState('')
  const [fold, setFold] = useState<{ epoch: number; mode: 'open' | 'closed' | null }>({ epoch: 0, mode: null })
  const imp = useRef<HTMLInputElement>(null)
  const changes = changedIds(t).size
  return (
    <FoldCtx.Provider value={fold}>
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
          <TextField select size="small" label="Theme in use" value={t.id} onChange={(e) => setActiveTheme(e.target.value)}>
            {themes.map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" sx={{ whiteSpace: 'nowrap' }} onClick={() => { const n = prompt('New theme name (copies the current theme)', `${t.name} copy`); if (n) newTheme(n) }}>+ New theme</Button>
            <Button size="small" variant="outlined" onClick={() => { const n = prompt('Rename', t.name); if (n) renameTheme(n) }}>Rename</Button>
            <Button size="small" variant="outlined" color="error" disabled={themes.length < 2} onClick={() => confirm(`Delete "${t.name}"?`) && deleteTheme()}>Delete</Button>
          </Box>
          <Typography variant="body2"><b>Editing: {t.name}</b>{' '}<Box component="span" sx={{ color: changes ? 'primary.main' : 'text.secondary' }}>{changes ? `${changes} change${changes === 1 ? '' : 's'} from default` : 'matches the default'}</Box></Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="contained" sx={{ whiteSpace: 'nowrap' }} onClick={() => download(new Blob([themeFileSource(t, true)]), `${t.name.replace(/\W+/g, '-').toLowerCase()}.theme.ts`)}>Export theme</Button>
            <Button size="small" variant="contained" sx={{ whiteSpace: 'nowrap' }} onClick={() => imp.current?.click()}>Import theme</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setFold({ epoch: fold.epoch + 1, mode: 'open' })}>Expand all</Typography>
            <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setFold({ epoch: fold.epoch + 1, mode: 'closed' })}>Collapse all</Typography>
          </Box>
          <input ref={imp} type="file" accept=".ts,.json,.txt" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            const th = parseThemeFile(await f.text())
            if (th) { importTheme(th); setMsg(`Imported "${th.name}"`) } else setMsg('Not a theme file exported from this tool.')
          }} />
        </Box>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 6, bgcolor: 'background.paper', borderBottom: '0.0625rem solid', borderColor: 'divider', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>You are editing</Typography>
          <ToggleButtonGroup size="small" exclusive color="primary" value={mode} onChange={(_, v) => v && setMode(v)}>
            <ToggleButton value="light" sx={{ gap: 0.5, px: 1.5 }}><LightMode fontSize="small" />LIGHT</ToggleButton>
            <ToggleButton value="dark" sx={{ gap: 0.5, px: 1.5 }}><DarkMode fontSize="small" />DARK</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>Canvas and values show this mode.</Typography>
        </Box>
        <ColoursSection />
        <SurfacesSection />
        <FontsSection />
        <TextStylesSection />
        <SpacingSection />
        <RadiusSection />
        <ShadowsSection />
        <ButtonsSection />
        <Snackbar open={!!msg} autoHideDuration={4000} onClose={() => setMsg('')} message={msg} />
      </Box>
    </FoldCtx.Provider>
  )
}
