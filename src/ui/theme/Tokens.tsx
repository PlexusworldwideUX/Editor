import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Delete from '@mui/icons-material/Delete'
import { ColorInput, RemField } from '../Fields'
import { getTheme, updateTheme, useStore } from '../../store'
import { shadowValue, slug, type RadiusToken, type ShadowLayer, type ShadowToken, type Theme } from '../../model/theme'
import { rem, toCss } from '../../model/rem'
import { ChangedChip, Fold, Hint, RefPicker, Sec, SliderRem, defaults } from './common'

const addBox = { display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 } as const
const Name = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <TextField size="small" variant="standard" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: '5rem', flex: 1 }} slotProps={{ input: { sx: { fontWeight: 600 } } }} />
)

export function SpacingSection() {
  const t = useStore(getTheme)
  const [name, setName] = useState('')
  const [value, setValue] = useState<number | undefined>(rem(1))
  const def = defaults()
  const unit = Number(toCss(t.spacingUnit).replace('rem', '')) || 0
  const setTok = (id: string, p: Record<string, unknown>) => updateTheme((x) => ({ ...x, spacing: x.spacing.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  return (
    <Sec title="Spacing" count={t.spacing.length + 1} help="The base step every gap and padding is built from. Layouts use multiples of it (1×, 2×, 3×) so everything lines up.">
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2">Spacing step</Typography>
            <ChangedChip show={t.spacingUnit !== def.spacingUnit} onReset={() => updateTheme((x) => ({ ...x, spacingUnit: def.spacingUnit }))} />
          </Box>
          <SliderRem label="Step" value={t.spacingUnit} min={0.25} max={2} step={0.0625} onChange={(v) => updateTheme((x) => ({ ...x, spacingUnit: v }))} />
          <Hint>{toCss(t.spacingUnit)} per step, so 2× = {+(unit * 2).toFixed(4)}rem and 3× = {+(unit * 3).toFixed(4)}rem.</Hint>
        </Box>
        <Box sx={{ width: '8rem', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          {[1, 2, 3, 4].map((n) => (
            <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
              <Typography variant="caption" sx={{ width: '1.5rem' }}>{n}×</Typography>
              <Box sx={{ height: '0.625rem', width: `${unit * n}rem`, maxWidth: '5rem', bgcolor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
          ))}
        </Box>
      </Box>
      <Typography variant="subtitle2">Named spacing</Typography>
      {t.spacing.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField size="small" value={s.name} onChange={(e) => setTok(s.id, { name: e.target.value })} sx={{ flex: 1 }} />
          <RemField label="Value" allowEmpty={false} width="8rem" value={s.value} onChange={(v) => v !== undefined && setTok(s.id, { value: v })} />
          <IconButton size="small" onClick={() => updateTheme((x) => ({ ...x, spacing: x.spacing.filter((y) => y.id !== s.id) }))} aria-label="delete spacing"><Delete fontSize="small" /></IconButton>
        </Box>
      ))}
      <Box sx={addBox}>
        <Typography variant="caption" color="text.secondary">Add a spacing value</Typography>
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <RemField label="Value" allowEmpty={false} value={value} onChange={setValue} />
        <Button variant="contained" disabled={!name.trim() || value === undefined} onClick={() => { updateTheme((x) => ({ ...x, spacing: [...x.spacing, { id: slug(name, x.spacing.map((s) => s.id)), name: name.trim(), value: value! }] })); setName('') }}>Add spacing</Button>
      </Box>
    </Sec>
  )
}

function usedBy(t: Theme, id: string) {
  return t.buttons.styles.filter((v) => v.radius === id).map((v) => `${v.name} button`)
}

function RadiusCard({ r, t }: { r: RadiusToken; t: Theme }) {
  const def = defaults().radius.find((d) => d.id === r.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(r)
  const set = (p: Partial<RadiusToken>) => updateTheme((x) => ({ ...x, radius: x.radius.map((y) => (y.id === r.id ? { ...y, ...p } : y)) }))
  const by = usedBy(t, r.id)
  return (
    <Fold header={
      <>
        <Box sx={{ width: '1.75rem', height: '1.25rem', border: '0.125rem solid', borderColor: 'primary.main', borderRadius: toCss(Math.min(r.value, 1000)), flexShrink: 0 }} />
        <Name value={r.name} onChange={(v) => set({ name: v })} />
        <Typography variant="caption" color="text.secondary">{toCss(r.value) === '0' ? '0rem' : toCss(r.value)}</Typography>
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <IconButton size="small" disabled={r.core} onClick={() => updateTheme((x) => ({ ...x, radius: x.radius.filter((y) => y.id !== r.id) }))} aria-label="delete radius"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <TextField size="small" label="Description" value={r.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}><SliderRem label="Radius" value={r.value} min={0} max={r.id === 'full' ? 62.5 : 2} step={r.id === 'full' ? 0.5 : 0.0625} onChange={(v) => set({ value: v })} /></Box>
        <Box sx={{ width: '6rem', height: '3rem', bgcolor: 'primary.main', borderRadius: toCss(r.value), flexShrink: 0 }} />
      </Box>
      <Hint>0 = square. Used by: {by.length ? by.join(', ') : 'nothing in the theme yet'}. Pick this by name on any element.</Hint>
    </Fold>
  )
}

export function RadiusSection() {
  const t = useStore(getTheme)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState<number | undefined>(rem(0.5))
  return (
    <Sec title="Radius" count={t.radius.length} help="Named corner radii. Control is for buttons, inputs and chips; Surface is for cards, dialogs and alerts. Buttons and elements pick one of these by name.">
      {t.radius.map((r) => <RadiusCard key={r.id} r={r} t={t} />)}
      <Box sx={addBox}>
        <Typography variant="caption" color="text.secondary">Add a radius</Typography>
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <RemField label="Radius" allowEmpty={false} value={value} onChange={setValue} />
        <Button variant="contained" disabled={!name.trim() || value === undefined} onClick={() => { updateTheme((x) => ({ ...x, radius: [...x.radius, { id: slug(name, x.radius.map((s) => s.id)), name: name.trim(), description: description.trim() || undefined, value: value! }] })); setName(''); setDescription('') }}>Add radius</Button>
      </Box>
    </Sec>
  )
}

function LayerEditor({ l, onChange, onRemove }: { l: ShadowLayer; onChange: (p: Partial<ShadowLayer>) => void; onRemove: () => void }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <SliderRem label="Left / right" value={l.x} min={-2} max={2} onChange={(v) => onChange({ x: v })} />
      <SliderRem label="Up / down" value={l.y} min={-2} max={3} onChange={(v) => onChange({ y: v })} />
      <SliderRem label="Softness (blur)" value={l.blur} min={0} max={6} onChange={(v) => onChange({ blur: v })} />
      <SliderRem label="Size (spread)" value={l.spread} min={-2} max={2} onChange={(v) => onChange({ spread: v })} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: '11rem' }}><RefPicker hex={l.color} refId={l.colorRef} onPick={(color, colorRef) => onChange({ color, colorRef })} /></Box>
        <Slider size="small" value={l.alpha} min={0} max={1} step={0.01} onChange={(_, v) => onChange({ alpha: v as number })} sx={{ flex: 1 }} aria-label="opacity" />
        <Typography variant="caption" sx={{ width: '2.5rem' }}>{Math.round(l.alpha * 100)}%</Typography>
      </Box>
      <Button size="small" color="error" onClick={onRemove}>Remove layer</Button>
    </Box>
  )
}

function ShadowCard({ s, t }: { s: ShadowToken; t: Theme }) {
  const def = defaults().shadows.find((d) => d.id === s.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(s)
  const set = (p: Partial<ShadowToken>) => updateTheme((x) => ({ ...x, shadows: x.shadows.map((y) => (y.id === s.id ? { ...y, ...p } : y)) }))
  const setLayer = (i: number, p: Partial<ShadowLayer>) => set({ layers: s.layers.map((l, j) => (j === i ? { ...l, ...p } : l)) })
  return (
    <Fold header={
      <>
        <Name value={s.name} onChange={(v) => set({ name: v })} />
        <TextField size="small" variant="standard" value={s.description ?? ''} placeholder="Where is it used?" onChange={(e) => set({ description: e.target.value })} sx={{ flex: 2, minWidth: '4rem' }} />
        <Box sx={{ width: '2rem', height: '1.5rem', borderRadius: 0.5, bgcolor: 'background.paper', boxShadow: shadowValue(t, s.id), flexShrink: 0 }} />
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <IconButton size="small" disabled={s.core} onClick={() => updateTheme((x) => ({ ...x, shadows: x.shadows.filter((y) => y.id !== s.id) }))} aria-label="delete shadow"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 1, display: 'grid', placeItems: 'center' }}>
        <Box sx={{ width: '8rem', height: '4rem', bgcolor: 'background.paper', borderRadius: 1, boxShadow: shadowValue(t, s.id), display: 'grid', placeItems: 'center' }}><Typography variant="caption">{s.description || s.name}</Typography></Box>
      </Box>
      {s.layers.map((l, i) => <LayerEditor key={i} l={l} onChange={(p) => setLayer(i, p)} onRemove={() => set({ layers: s.layers.filter((_, j) => j !== i) })} />)}
      {!s.core && <Button size="small" variant="outlined" onClick={() => set({ layers: [...s.layers, { x: 0, y: rem(0.25), blur: rem(0.5), spread: 0, color: '#000000', colorRef: 'black', alpha: 0.2 }] })}>Add layer</Button>}
    </Fold>
  )
}

export function ShadowsSection() {
  const t = useStore(getTheme)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [l, setL] = useState<ShadowLayer>({ x: 0, y: rem(0.25), blur: rem(0.5), spread: 0, color: '#000000', colorRef: 'black', alpha: 0.2 })
  return (
    <Sec title="Shadows" count={t.shadows.length} help="How raised an element looks. Level 1 sits just above the page; higher levels float further. Rename, adjust, add or delete levels and the canvas follows.">
      {t.shadows.map((s) => <ShadowCard key={s.id} s={s} t={t} />)}
      <Box sx={addBox}>
        <Typography variant="caption" color="text.secondary">Add a shadow level</Typography>
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <LayerEditor l={l} onChange={(p) => setL({ ...l, ...p })} onRemove={() => setL({ x: 0, y: rem(0.25), blur: rem(0.5), spread: 0, color: '#000000', colorRef: 'black', alpha: 0.2 })} />
        <Button variant="contained" disabled={!name.trim()} onClick={() => { updateTheme((x) => ({ ...x, shadows: [...x.shadows, { id: slug(name, x.shadows.map((s) => s.id)), name: name.trim(), description: description.trim() || undefined, layers: [l] }] })); setName(''); setDescription('') }}>Add shadow level</Button>
      </Box>
    </Sec>
  )
}
void Chip
