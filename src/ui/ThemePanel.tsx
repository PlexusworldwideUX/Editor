import { useRef, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Delete from '@mui/icons-material/Delete'
import { slug, type ColorGroup, type FontFamily, type ShadowLayer, type Theme } from '../model/theme'
import { deleteTheme, getTheme, importTheme, newTheme, renameTheme, setActiveTheme, updateTheme, useStore } from '../store'
import { ColorInput, RemField } from './Fields'
import { parseThemeFile, themeFileSource } from '../export/codegen'
import { download } from './download'
import { rem } from '../model/rem'

const readData = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) })
const Del = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <IconButton size="small" disabled={disabled} onClick={onClick} aria-label="delete"><Delete fontSize="small" /></IconButton>
)
const addBox = { display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 } as const

/** Every add form collects all of its values at once. */
function AddColor({ group }: { group: ColorGroup }) {
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#1976d2')
  const add = () => { updateTheme((x) => ({ ...x, colors: [...x.colors, { id: slug(name, x.colors.map((c) => c.id)), name: name.trim(), group, light: hex, dark: hex }] })); setName('') }
  return (
    <Box sx={addBox}>
      <Typography variant="caption" color="text.secondary">Add {group}</Typography>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <ColorInput value={hex} onChange={setHex} label="Hex (light and dark)" />
      <Button variant="contained" disabled={!name.trim()} onClick={add}>Add {group}</Button>
    </Box>
  )
}
function AddValue({ label, onAdd }: { label: string; onAdd: (name: string, value: number) => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState<number | undefined>(rem(1))
  return (
    <Box sx={addBox}>
      <Typography variant="caption" color="text.secondary">Add {label}</Typography>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <RemField label="Value" allowEmpty={false} value={value} onChange={setValue} />
      <Button variant="contained" disabled={!name.trim() || value === undefined} onClick={() => { onAdd(name.trim(), value!); setName('') }}>Add {label}</Button>
    </Box>
  )
}
function AddTextStyle({ t }: { t: Theme }) {
  const [name, setName] = useState('')
  const [fontId, setFontId] = useState(t.fonts[0]?.id ?? '')
  const [size, setSize] = useState<number | undefined>(rem(1.5))
  const [weight, setWeight] = useState(400)
  const [lh, setLh] = useState(1.3)
  const [ls, setLs] = useState<number | undefined>(0)
  return (
    <Box sx={addBox}>
      <Typography variant="caption" color="text.secondary">Add text style</Typography>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField select size="small" label="Font" value={fontId} onChange={(e) => setFontId(e.target.value)}>{t.fonts.map((f) => <MenuItem key={f.id} value={f.id}>{f.family}</MenuItem>)}</TextField>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <RemField label="Size" allowEmpty={false} value={size} onChange={setSize} />
        <RemField label="Letter spacing" allowEmpty={false} value={ls} onChange={setLs} />
        <TextField size="small" label="Weight" type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        <TextField size="small" label="Line height" type="number" value={lh} slotProps={{ htmlInput: { step: 0.05 } }} onChange={(e) => setLh(Number(e.target.value))} />
      </Box>
      <Button variant="contained" disabled={!name.trim() || size === undefined || ls === undefined} onClick={() => {
        updateTheme((x) => ({ ...x, text: [...x.text, { id: slug(name, x.text.map((s) => s.id)), name: name.trim(), fontId, size: size!, weight, lineHeight: lh, letterSpacing: ls! }] })); setName('')
      }}>Add text style</Button>
    </Box>
  )
}
function AddShadow() {
  const [name, setName] = useState('')
  const [l, setL] = useState<{ x: number; y: number; blur: number; spread: number; color: string; alpha: number }>({ x: 0, y: rem(0.25), blur: rem(0.5), spread: 0, color: '#000000', alpha: 0.2 })
  const num = (k: 'x' | 'y' | 'blur' | 'spread', label: string) => <RemField label={label} allowEmpty={false} value={l[k]} onChange={(v) => v !== undefined && setL({ ...l, [k]: v })} />
  return (
    <Box sx={addBox}>
      <Typography variant="caption" color="text.secondary">Add shadow</Typography>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>{num('x', 'X')}{num('y', 'Y')}{num('blur', 'Blur')}{num('spread', 'Spread')}</Box>
      <ColorInput value={l.color} onChange={(color) => setL({ ...l, color })} label="Colour" />
      <TextField size="small" label="Opacity (0 to 1)" type="number" value={l.alpha} slotProps={{ htmlInput: { step: 0.05, min: 0, max: 1 } }} onChange={(e) => setL({ ...l, alpha: Math.min(1, Math.max(0, Number(e.target.value))) })} />
      <Button variant="contained" disabled={!name.trim()} onClick={() => { updateTheme((x) => ({ ...x, shadows: [...x.shadows, { id: slug(name, x.shadows.map((s) => s.id)), name: name.trim(), layers: [l] }] })); setName('') }}>Add shadow</Button>
    </Box>
  )
}
const col = { display: 'flex', flexDirection: 'column', gap: 1.5 } as const

function Colours({ t, group }: { t: Theme; group: ColorGroup }) {
  const mode = useStore((s) => s.mode)
  const list = t.colors.filter((c) => c.group === group)
  const edit = (id: string, patch: Record<string, string>) => updateTheme((x) => ({ ...x, colors: x.colors.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  return (
    <Box sx={col}>
      <Typography variant="caption" color="text.secondary">Editing {mode} mode. Switch light/dark in the top bar.</Typography>
      {list.map((c) => (
        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField size="small" value={c.name} onChange={(e) => edit(c.id, { name: e.target.value })} sx={{ flex: 1, minWidth: 0 }} />
          <ColorInput compact value={c[mode]} onChange={(hex) => edit(c.id, { [mode]: hex })} />
          <Del disabled={c.core} onClick={() => updateTheme((x) => ({ ...x, colors: x.colors.filter((y) => y.id !== c.id) }))} />
        </Box>
      ))}
      <AddColor group={group} />
      <Typography variant="caption" color="text.secondary">Built-in tokens (greyed delete) feed the Material theme and can't be removed.</Typography>
    </Box>
  )
}

function Fonts({ t }: { t: Theme }) {
  const [g, setG] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const add = (f: FontFamily) => updateTheme((x) => ({ ...x, fonts: [...x.fonts, f] }))
  const id = (name: string) => slug(name, t.fonts.map((f) => f.id))
  return (
    <Box sx={col}>
      {t.fonts.map((f) => (
        <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField size="small" value={f.family} label={f.source} sx={{ flex: 1 }}
            onChange={(e) => updateTheme((x) => ({ ...x, fonts: x.fonts.map((y) => (y.id === f.id ? { ...y, family: e.target.value } : y)) }))} />
          <Del disabled={t.fonts.length < 2} onClick={() => updateTheme((x) => ({ ...x, fonts: x.fonts.filter((y) => y.id !== f.id) }))} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label="Google font name" value={g} onChange={(e) => setG(e.target.value)} sx={{ flex: 1 }} />
        <Button variant="outlined" disabled={!g.trim()} onClick={() => { add({ id: id(g), family: g.trim(), source: 'google' }); setG('') }}>Add</Button>
      </Box>
      <Button variant="outlined" onClick={() => file.current?.click()}>Upload font file (OTF, TTF, WOFF, WOFF2)</Button>
      <input ref={file} type="file" accept=".otf,.ttf,.woff,.woff2" hidden multiple onChange={async (e) => {
        for (const f of Array.from(e.target.files ?? [])) {
          const name = f.name.replace(/\.[^.]+$/, '')
          add({ id: slug(name, getTheme(useStoreState()).fonts.map((x) => x.id)), family: name, source: 'upload', file: { name: f.name, mime: f.type || 'font/ttf', dataUrl: await readData(f) } })
        }
        e.target.value = ''
      }} />
    </Box>
  )
}
import { getState } from '../store'
const useStoreState = () => getState()

function TextStyles({ t }: { t: Theme }) {
  const set = (id: string, patch: Record<string, unknown>) => updateTheme((x) => ({ ...x, text: x.text.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  return (
    <Box sx={col}>
      {t.text.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1.5, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" value={s.name} onChange={(e) => set(s.id, { name: e.target.value })} sx={{ flex: 1 }} />
            <Del disabled={s.id === 'body1'} onClick={() => updateTheme((x) => ({ ...x, text: x.text.filter((y) => y.id !== s.id) }))} />
          </Box>
          <TextField select size="small" label="Font" value={s.fontId} onChange={(e) => set(s.id, { fontId: e.target.value })}>
            {t.fonts.map((f) => <MenuItem key={f.id} value={f.id}>{f.family}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <RemField label="Size" allowEmpty={false} value={s.size} onChange={(n) => n !== undefined && set(s.id, { size: n })} />
            <RemField label="Letter spacing" allowEmpty={false} value={s.letterSpacing} onChange={(n) => n !== undefined && set(s.id, { letterSpacing: n })} />
            <TextField size="small" label="Weight" type="number" value={s.weight} onChange={(e) => set(s.id, { weight: Number(e.target.value) })} />
            <TextField size="small" label="Line height" type="number" value={s.lineHeight} slotProps={{ htmlInput: { step: 0.05 } }} onChange={(e) => set(s.id, { lineHeight: Number(e.target.value) })} />
          </Box>
        </Box>
      ))}
      <AddTextStyle t={t} />
    </Box>
  )
}

function Spacing({ t }: { t: Theme }) {
  return (
    <Box sx={col}>
      <RemField label="Spacing step (1 unit, used by MUI spacing)" allowEmpty={false} value={t.spacingUnit} onChange={(v) => v !== undefined && updateTheme((x) => ({ ...x, spacingUnit: v }))} />
      {t.spacing.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField size="small" value={s.name} onChange={(e) => updateTheme((x) => ({ ...x, spacing: x.spacing.map((y) => (y.id === s.id ? { ...y, name: e.target.value } : y)) }))} sx={{ flex: 1 }} />
          <RemField label="Value" allowEmpty={false} width="8rem" value={s.value} onChange={(v) => v !== undefined && updateTheme((x) => ({ ...x, spacing: x.spacing.map((y) => (y.id === s.id ? { ...y, value: v } : y)) }))} />
          <Del onClick={() => updateTheme((x) => ({ ...x, spacing: x.spacing.filter((y) => y.id !== s.id) }))} />
        </Box>
      ))}
      <AddValue label="spacing" onAdd={(name, value) => updateTheme((x) => ({ ...x, spacing: [...x.spacing, { id: slug(name, x.spacing.map((s) => s.id)), name, value }] }))} />
    </Box>
  )
}

function Radius({ t }: { t: Theme }) {
  return (
    <Box sx={col}>
      {t.radius.map((r) => (
        <Box key={r.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField size="small" value={r.name} onChange={(e) => updateTheme((x) => ({ ...x, radius: x.radius.map((y) => (y.id === r.id ? { ...y, name: e.target.value } : y)) }))} sx={{ flex: 1 }} />
          <RemField label="Value" allowEmpty={false} width="8rem" value={r.value} onChange={(v) => v !== undefined && updateTheme((x) => ({ ...x, radius: x.radius.map((y) => (y.id === r.id ? { ...y, value: v } : y)) }))} />
          <Del disabled={r.core} onClick={() => updateTheme((x) => ({ ...x, radius: x.radius.filter((y) => y.id !== r.id) }))} />
        </Box>
      ))}
      <AddValue label="radius" onAdd={(name, value) => updateTheme((x) => ({ ...x, radius: [...x.radius, { id: slug(name, x.radius.map((s) => s.id)), name, value }] }))} />
    </Box>
  )
}

function Shadows({ t }: { t: Theme }) {
  const setLayer = (sid: string, i: number, patch: Partial<ShadowLayer>) =>
    updateTheme((x) => ({ ...x, shadows: x.shadows.map((s) => (s.id === sid ? { ...s, layers: s.layers.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : s)) }))
  return (
    <Box sx={col}>
      {t.shadows.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1.5, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" value={s.name} disabled={s.core} onChange={(e) => updateTheme((x) => ({ ...x, shadows: x.shadows.map((y) => (y.id === s.id ? { ...y, name: e.target.value } : y)) }))} sx={{ flex: 1 }} />
            <Del disabled={s.core} onClick={() => updateTheme((x) => ({ ...x, shadows: x.shadows.filter((y) => y.id !== s.id) }))} />
          </Box>
          {s.layers.map((l, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <RemField label="X" allowEmpty={false} value={l.x} onChange={(v) => v !== undefined && setLayer(s.id, i, { x: v })} />
              <RemField label="Y" allowEmpty={false} value={l.y} onChange={(v) => v !== undefined && setLayer(s.id, i, { y: v })} />
              <RemField label="Blur" allowEmpty={false} value={l.blur} onChange={(v) => v !== undefined && setLayer(s.id, i, { blur: v })} />
              <RemField label="Spread" allowEmpty={false} value={l.spread} onChange={(v) => v !== undefined && setLayer(s.id, i, { spread: v })} />
              <Box sx={{ gridColumn: "1 / -1" }}><ColorInput value={l.color} onChange={(color) => setLayer(s.id, i, { color })} label="Colour" /></Box>
                <TextField size="small" label="Opacity" type="number" value={l.alpha} slotProps={{ htmlInput: { step: 0.05, min: 0, max: 1 } }} onChange={(e) => setLayer(s.id, i, { alpha: Math.min(1, Math.max(0, Number(e.target.value))) })} />
              <Button size="small" color="error" onClick={() => updateTheme((x) => ({ ...x, shadows: x.shadows.map((y) => (y.id === s.id ? { ...y, layers: y.layers.filter((_, j) => j !== i) } : y)) }))}>Remove layer</Button>
            </Box>
          ))}
          {!s.core && <Button size="small" variant="outlined" onClick={() => updateTheme((x) => ({ ...x, shadows: x.shadows.map((y) => (y.id === s.id ? { ...y, layers: [...y.layers, { x: 0, y: rem(0.25), blur: rem(0.5), spread: 0, color: '#000000', alpha: 0.2 }] } : y)) }))}>Add layer</Button>}
        </Box>
      ))}
      <AddShadow />
    </Box>
  )
}

function Buttons({ t }: { t: Theme }) {
  const b = t.buttons
  const set = (patch: Partial<typeof b>) => updateTheme((x) => ({ ...x, buttons: { ...x.buttons, ...patch } }))
  return (
    <Box sx={col}>
      <TextField select size="small" label="Corner radius" value={b.radius} onChange={(e) => set({ radius: e.target.value })}>
        {t.radius.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label="Contained shadow" value={b.shadow} onChange={(e) => set({ shadow: e.target.value })}>
        {t.shadows.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
      </TextField>
      <FormControlLabel label="Uppercase labels" control={<Switch size="small" checked={b.textTransform === 'uppercase'} onChange={(e) => set({ textTransform: e.target.checked ? 'uppercase' : 'none' })} />} />
      <TextField size="small" label="Weight" type="number" value={b.weight} onChange={(e) => set({ weight: Number(e.target.value) })} />
      {(['small', 'medium', 'large'] as const).map((sz) => (
        <Box key={sz} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <RemField label={`${sz} padding Y`} allowEmpty={false} value={b.pad[sz].y} onChange={(v) => v !== undefined && set({ pad: { ...b.pad, [sz]: { ...b.pad[sz], y: v } } })} />
          <RemField label={`${sz} padding X`} allowEmpty={false} value={b.pad[sz].x} onChange={(v) => v !== undefined && set({ pad: { ...b.pad, [sz]: { ...b.pad[sz], x: v } } })} />
        </Box>
      ))}
    </Box>
  )
}

export function ThemePanel() {
  const themes = useStore((s) => s.themes)
  const t = useStore(getTheme)
  const mode = useStore((s) => s.mode)
  const [msg, setMsg] = useState('')
  const imp = useRef<HTMLInputElement>(null)
  const acc = (title: string, count: number | null, body: React.ReactNode, open = false) => (
    <Accordion defaultExpanded={open} disableGutters square elevation={0} sx={{ borderBottom: '0.0625rem solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">{title}</Typography>
        {count !== null && <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>{count}</Typography>}
      </AccordionSummary>
      <AccordionDetails>{body}</AccordionDetails>
    </Accordion>
  )
  return (
    <Box sx={{ overflow: 'auto', flex: 1 }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
        <TextField select size="small" label="Theme (editing and in use)" value={t.id} onChange={(e) => setActiveTheme(e.target.value)}>
          {themes.map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
        </TextField>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={() => { const n = prompt('New theme name (copies the current theme)', `${t.name} copy`); if (n) newTheme(n) }}>New</Button>
          <Button size="small" variant="outlined" onClick={() => { const n = prompt('Rename', t.name); if (n) renameTheme(n) }}>Rename</Button>
          <Button size="small" variant="outlined" color="error" disabled={themes.length < 2} onClick={() => confirm(`Delete "${t.name}"?`) && deleteTheme()}>Delete</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained" onClick={() => download(new Blob([themeFileSource(t, true)]), `${t.name.replace(/\W+/g, '-').toLowerCase()}.theme.ts`)}>Export theme</Button>
          <Button size="small" variant="contained" onClick={() => imp.current?.click()}>Import theme</Button>
          <input ref={imp} type="file" accept=".ts,.json,.txt" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            const th = parseThemeFile(await f.text())
            if (th) { importTheme(th); setMsg(`Imported "${th.name}"`) } else setMsg('Not a theme file exported from this tool.')
          }} />
        </Box>
        <Typography variant="caption" color="text.secondary">Previewing in {mode} mode.</Typography>
      </Box>
      {acc('Colours', t.colors.filter((c) => c.group === 'colour').length, <Colours t={t} group="colour" />, true)}
      {acc('Surfaces', t.colors.filter((c) => c.group === 'surface').length, <Colours t={t} group="surface" />)}
      {acc('Fonts', t.fonts.length, <Fonts t={t} />)}
      {acc('Text styles', t.text.length, <TextStyles t={t} />)}
      {acc('Spacing', t.spacing.length, <Spacing t={t} />)}
      {acc('Radius', t.radius.length, <Radius t={t} />)}
      {acc('Shadows', t.shadows.length, <Shadows t={t} />)}
      {acc('Buttons', null, <Buttons t={t} />)}
      <Snackbar open={!!msg} autoHideDuration={4000} onClose={() => setMsg('')} message={msg} />
    </Box>
  )
}
