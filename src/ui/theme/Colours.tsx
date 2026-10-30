import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Delete from '@mui/icons-material/Delete'
import LightMode from '@mui/icons-material/LightMode'
import DarkMode from '@mui/icons-material/DarkMode'
import { ColorInput } from '../Fields'
import { getTheme, updateTheme, useStore } from '../../store'
import {
  SURFACE_ROLES, TONES, contrast, genTones, rating, recalc, resolveColor, slug, textOnAuto,
  type ColorFamily, type ColorToken, type SurfaceRole, type ToneSel,
} from '../../model/theme'
import { ChangedChip, Fold, Hint, RefPicker, Sec, TonePicker, defaults } from './common'
import { ButtonPreview } from './Buttons'

const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
  <Chip size="small" label={`${label} ${ok ? '✓' : '✕'}`} color={ok ? 'success' : 'error'} variant="outlined" sx={{ height: '1.25rem', fontSize: '0.6875rem' }} />
)
const Mini = ({ hex }: { hex: string }) => <Box sx={{ width: '1.25rem', height: '1.25rem', borderRadius: 0.5, bgcolor: hex, border: '0.0625rem solid rgba(0,0,0,.25)', flexShrink: 0 }} />

function ContrastRow({ label, bg }: { label: string; bg: string }) {
  const w = contrast(bg, '#ffffff'), k = contrast(bg, '#000000')
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ width: '3rem', fontWeight: 600 }}>{label}</Typography>
      <Mini hex={bg} />
      <Typography variant="caption" color="text.secondary">on white {w.toFixed(1)}:1</Typography><Badge ok={rating(w).aa} label="AA" /><Badge ok={rating(w).aaa} label="AAA" />
      <Typography variant="caption" color="text.secondary">on black {k.toFixed(1)}:1</Typography><Badge ok={rating(k).aa} label="AA" /><Badge ok={rating(k).aaa} label="AAA" />
    </Box>
  )
}

function ToneSelect({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} sx={{ flex: 1, minWidth: 0 }}>
      {TONES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
    </TextField>
  )
}

function ColourCard({ c }: { c: ColorToken }) {
  const theme = useStore(getTheme)
  const mode = useStore((s) => s.mode)
  const def = defaults().colors.find((d) => d.id === c.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(c)
  const set = (patch: Partial<ColorToken>) => updateTheme((x) => ({ ...x, colors: x.colors.map((y) => (y.id === c.id ? recalc({ ...y, ...patch }) : y)) }))
  const tones = c.tones!
  const base = c.base ?? c.light
  const ls = c.lightSel!, ds = c.darkSel!
  const r = resolveColor(c, mode)
  const modeSel = mode === 'light' ? ls : ds
  const setSel = (m: 'light' | 'dark', patch: Partial<ToneSel>) => set(m === 'light' ? { lightSel: { ...ls, ...patch } } : { darkSel: { ...ds, ...patch } })
  const marker = (t: number) => (t === modeSel.light ? 'L' : t === modeSel.main ? 'M' : t === modeSel.dark ? 'D' : '')
  const textOn = c.textOn ?? textOnAuto(r.main)
  return (
    <Fold header={
      <>
        <Mini hex={c.light} /><Mini hex={c.dark} />
        <TextField size="small" variant="standard" value={c.name} onChange={(e) => set({ name: e.target.value })} sx={{ minWidth: '6rem', flex: 1 }} slotProps={{ input: { sx: { fontWeight: 600 } } }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{base}</Typography>
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <IconButton size="small" disabled={c.core} onClick={() => updateTheme((x) => ({ ...x, colors: x.colors.filter((y) => y.id !== c.id) }))} aria-label="delete colour"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <TextField size="small" label="Description" value={c.description ?? ''} placeholder="What is this colour for?" onChange={(e) => set({ description: e.target.value })} />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Base colour</Typography>
        <ColorInput value={base} onChange={(hex) => set({ base: hex, tones: genTones(hex) })} label="Base hex" />
        <Hint>Tone 500 is this colour. Every other tone, from 50 (lightest) to 950 (darkest), is calculated from it. Edit any tone below to adjust it by hand.</Hint>
      </Box>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>Tones ({mode} mode: L light, M main, D dark)</Typography>
          <Button size="small" onClick={() => set({ tones: genTones(base) })}>Revert tones</Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: 0.25 }}>
          {TONES.map((t) => (
            <Box key={t} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.5625rem', height: '0.75rem', fontWeight: 700, color: 'primary.main' }}>{marker(t)}</Typography>
              <Box component="label" sx={{ display: 'block', height: '2rem', bgcolor: tones[String(t)], borderRadius: 0.5, cursor: 'pointer', position: 'relative', outline: marker(t) ? '0.125rem solid #0b57d0' : 'none' }}>
                <input type="color" value={tones[String(t)]} onChange={(e) => set({ tones: { ...tones, [String(t)]: e.target.value } })} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              </Box>
              <Typography sx={{ fontSize: '0.625rem' }}>{t}</Typography>
              <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', wordBreak: 'break-all' }}>{tones[String(t)]}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="subtitle2">Contrast ({mode} mode)</Typography>
        <ContrastRow label="Light" bg={r.light} /><ContrastRow label="Main" bg={r.main} /><ContrastRow label="Dark" bg={r.dark} />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Light / Main / Dark</Typography>
        {(['light', 'dark'] as const).map((m) => (
          <Box key={m} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">{m === 'light' ? 'Light mode' : 'Dark mode'}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToneSelect label="Light" value={(m === 'light' ? ls : ds).light} onChange={(n) => setSel(m, { light: n })} />
            <ToneSelect label="Main" value={(m === 'light' ? ls : ds).main} onChange={(n) => setSel(m, { main: n })} />
            <ToneSelect label="Dark" value={(m === 'light' ? ls : ds).dark} onChange={(n) => setSel(m, { dark: n })} />
            <Mini hex={tones[String((m === 'light' ? ls : ds).light)]} /><Mini hex={tones[String((m === 'light' ? ls : ds).main)]} /><Mini hex={tones[String((m === 'light' ? ls : ds).dark)]} />
            </Box>
          </Box>
        ))}
        <Hint>Main is the colour itself. Light and Dark are the tones used for hover and pressed.</Hint>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Text colour on this background</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: '9rem' }}><TonePicker value={textOn} onChange={(hex) => set({ textOn: hex })} /></Box>
          <Box sx={{ px: 1.5, py: 0.5, borderRadius: 5, bgcolor: r.main, color: textOn, fontSize: '0.8125rem' }}>Shop now</Box>
          <Badge ok={rating(contrast(r.main, textOn)).aa} label="AA" /><Badge ok={rating(contrast(r.main, textOn)).aaa} label="AAA" />
          {c.textOn ? <Button size="small" onClick={() => set({ textOn: undefined })}>Use automatic</Button> : <Chip size="small" label="Automatic" />}
        </Box>
        <Hint>Colour of labels and icons that sit on top of Main, such as a button's text.</Hint>
      </Box>
      {c.family !== 'greys' && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Button example</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['enabled', 'hover', 'pressed', 'focused', 'disabled'] as const).map((s) => <Box key={s} sx={{ m: '0.25rem' }}><ButtonPreview theme={theme} style={{ ...(theme.buttons.styles.find((x) => x.kind === 'contained') ?? theme.buttons.styles[0]), colorId: c.id }} mode={mode} state={s} /></Box>)}
          </Box>
        </Box>
      )}
    </Fold>
  )
}

function AddColour({ family }: { family: ColorFamily }) {
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#e50046')
  const add = () => {
    updateTheme((x) => {
      const id = slug(name, x.colors.map((c) => c.id))
      return { ...x, colors: [...x.colors.filter((c) => c.group === 'colour'), recalc({ id, name: name.trim(), group: 'colour', family, light: hex, dark: hex, base: hex, tones: genTones(hex), lightSel: { light: 400, main: 500, dark: 600 }, darkSel: { light: 200, main: 300, dark: 400 } }), ...x.colors.filter((c) => c.group !== 'colour')] }
    })
    setName('')
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">Add a colour</Typography>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} />
      <ColorInput value={hex} onChange={setHex} label="Hex" />
      <Button variant="contained" disabled={!name.trim()} onClick={add}>Add colour</Button>
    </Box>
  )
}

const FAMILIES: { id: ColorFamily; title: string; help: string }[] = [
  { id: 'brand', title: 'Brand colours', help: 'Your main brand colour and any campaign colours. Primary drives buttons, links and highlights.' },
  { id: 'supporting', title: 'Supporting colours', help: 'Status colours: error, warning, info and success.' },
  { id: 'greys', title: 'Greys and text', help: 'Text colours and neutral greys.' },
]

export function ColoursSection() {
  const theme = useStore(getTheme)
  const cols = theme.colors.filter((c) => c.group === 'colour' && c.tones)
  return (
    <Sec title="Colours" count={cols.length} help="Every colour in your theme, grouped. Each one has a tone scale, so hover and pressed colours come from the same family." defaultOpen>
      {FAMILIES.map((f) => {
        const list = cols.filter((c) => (c.family ?? 'brand') === f.id)
        return (
          <Fold key={f.id} defaultOpen={f.id === 'brand'} header={<><Typography variant="subtitle2">{f.title}</Typography><Chip size="small" label={list.length} sx={{ height: '1.25rem' }} /><Box sx={{ flex: 1 }} />{list.slice(0, 8).map((c) => <Mini key={c.id} hex={c.light} />)}</>}>
            <Hint>{f.help}</Hint>
            {list.map((c) => <ColourCard key={c.id} c={c} />)}
            <AddColour family={f.id} />
          </Fold>
        )
      })}
    </Sec>
  )
}

const roleInfo = (r: SurfaceRole | undefined) => SURFACE_ROLES.find((x) => x.role === r) ?? SURFACE_ROLES[SURFACE_ROLES.length - 1]

function ModeLabel({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, px: 0.75, py: 0.25, borderRadius: 0.5, width: 'fit-content', bgcolor: mode === 'light' ? 'action.hover' : 'grey.900', color: mode === 'light' ? 'text.primary' : 'grey.100' }}>
      {mode === 'light' ? <LightMode sx={{ fontSize: '0.875rem' }} /> : <DarkMode sx={{ fontSize: '0.875rem' }} />}
      <Typography variant="caption" sx={{ fontWeight: 700 }}>{mode === 'light' ? 'LIGHT' : 'DARK'}</Typography>
    </Box>
  )
}

function SurfaceCard({ c }: { c: ColorToken }) {
  const def = defaults().colors.find((d) => d.id === c.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(c)
  const set = (patch: Partial<ColorToken>) => updateTheme((x) => ({ ...x, colors: x.colors.map((y) => (y.id === c.id ? { ...y, ...patch } : y)) }))
  const info = roleInfo(c.role)
  return (
    <Fold defaultOpen header={
      <>
        <Mini hex={c.light} /><Mini hex={c.dark} />
        <TextField size="small" variant="standard" value={c.name} onChange={(e) => set({ name: e.target.value })} sx={{ flex: 1, minWidth: '5rem' }} slotProps={{ input: { sx: { fontWeight: 600 } } }} />
        <Chip size="small" label={info.label} sx={{ height: '1.25rem' }} />
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <IconButton size="small" disabled={c.core} onClick={() => updateTheme((x) => ({ ...x, colors: x.colors.filter((y) => y.id !== c.id) }))} aria-label="delete surface"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <TextField size="small" label="Description" value={c.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
      <TextField select size="small" label="What uses this surface" value={c.role ?? 'custom'} onChange={(e) => set({ role: e.target.value as SurfaceRole })} helperText={`${info.usedBy}. If two surfaces share a role, the first one is used.`}>
        {SURFACE_ROLES.map((r) => <MenuItem key={r.role} value={r.role}>{r.label}</MenuItem>)}
      </TextField>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Box><ModeLabel mode="light" /><RefPicker hex={c.light} refId={c.lightRef} onPick={(hex, ref) => set({ light: hex, lightRef: ref })} /></Box>
        <Box><ModeLabel mode="dark" /><RefPicker hex={c.dark} refId={c.darkRef} onPick={(hex, ref) => set({ dark: hex, darkRef: ref })} /></Box>
      </Box>
    </Fold>
  )
}

export function SurfacesSection() {
  const theme = useStore(getTheme)
  const list = theme.colors.filter((c) => c.group === 'surface')
  const [name, setName] = useState('')
  const [role, setRole] = useState<SurfaceRole>('custom')
  const [light, setLight] = useState<{ hex: string; ref?: string }>({ hex: '#ffffff', ref: 'white' })
  const [dark, setDark] = useState<{ hex: string; ref?: string }>({ hex: '#1e1e1e' })
  const add = () => {
    updateTheme((x) => ({ ...x, colors: [...x.colors, { id: slug(name, x.colors.map((c) => c.id)), name: name.trim(), group: 'surface', role, light: light.hex, lightRef: light.ref, dark: dark.hex, darkRef: dark.ref }] }))
    setName('')
  }
  return (
    <Sec title="Surfaces" count={list.length} defaultOpen help="The fills behind your content. Each surface has a Light and a Dark colour picked from your tones, and a role that says which library elements use it: the page, cards, dialogs, inputs and each kind of alert. Fills on the canvas can only use these.">
      {list.map((c) => <SurfaceCard key={c.id} c={c} />)}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">Add a surface</Typography>
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField select size="small" label="What uses this surface" value={role} onChange={(e) => setRole(e.target.value as SurfaceRole)}>
          {SURFACE_ROLES.map((r) => <MenuItem key={r.role} value={r.role}>{r.label}</MenuItem>)}
        </TextField>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box><ModeLabel mode="light" /><RefPicker hex={light.hex} refId={light.ref} onPick={(hex, ref) => setLight({ hex, ref })} /></Box>
          <Box><ModeLabel mode="dark" /><RefPicker hex={dark.hex} refId={dark.ref} onPick={(hex, ref) => setDark({ hex, ref })} /></Box>
        </Box>
        <Button variant="contained" disabled={!name.trim()} onClick={add}>Add surface</Button>
      </Box>
    </Sec>
  )
}
