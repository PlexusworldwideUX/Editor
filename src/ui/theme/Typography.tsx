import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Delete from '@mui/icons-material/Delete'
import { RemField } from '../Fields'
import { getTheme, updateTheme, useStore } from '../../store'
import { slug, textCss, type FontFamily, type TextStyle, type Theme } from '../../model/theme'
import { rem, toCss } from '../../model/rem'
import { ChangedChip, Fold, Hint, Sec, defaults } from './common'

const WEIGHTS: [number, string][] = [[100, 'Thin'], [200, 'Extra light'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold'], [900, 'Black']]
const readData = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) })

function FontCard({ f, t }: { f: FontFamily; t: Theme }) {
  const main = t.mainFontId === f.id
  const used = t.text.filter((s) => s.fontId === f.id).map((s) => s.name)
  return (
    <Fold header={
      <>
        <TextField size="small" variant="standard" value={f.family} sx={{ flex: 1, minWidth: '5rem' }} slotProps={{ input: { sx: { fontWeight: 600 } } }}
          onChange={(e) => updateTheme((x) => ({ ...x, fonts: x.fonts.map((y) => (y.id === f.id ? { ...y, family: e.target.value } : y)) }))} />
        <Typography sx={{ fontFamily: `"${f.family}", sans-serif`, fontSize: '1.25rem' }}>Aa</Typography>
        <Chip size="small" label={f.source === 'google' ? 'Google' : f.source === 'upload' ? 'Uploaded' : 'System'} sx={{ height: '1.25rem' }} />
        <FormControlLabel sx={{ m: 0 }} label={<Typography variant="caption">Main</Typography>} control={<Radio size="small" checked={main} onChange={() => updateTheme((x) => ({ ...x, mainFontId: f.id }))} />} />
        <IconButton size="small" disabled={t.fonts.length < 2 || main || used.length > 0} onClick={() => updateTheme((x) => ({ ...x, fonts: x.fonts.filter((y) => y.id !== f.id) }))} aria-label="delete font"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <Typography sx={{ fontFamily: `"${f.family}", sans-serif`, fontSize: '1.75rem' }}>Aa Bb Cc 123</Typography>
      <Hint>{used.length ? `Used by: ${used.join(', ')}` : 'Not used by any text style yet. You can delete it.'}</Hint>
    </Fold>
  )
}

function AddFont({ t }: { t: Theme }) {
  const [source, setSource] = useState<'google' | 'upload'>('google')
  const [family, setFamily] = useState('')
  const [file, setFile] = useState<{ name: string; mime: string; dataUrl: string } | null>(null)
  const pick = useRef<HTMLInputElement>(null)
  const ok = !!family.trim() && (source === 'google' || !!file)
  const add = () => {
    updateTheme((x) => ({ ...x, fonts: [...x.fonts, { id: slug(family, x.fonts.map((f) => f.id)), family: family.trim(), source, file: source === 'upload' ? file! : undefined }] }))
    setFamily(''); setFile(null)
  }
  void t
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">Add a font family</Typography>
      <ToggleButtonGroup size="small" exclusive value={source} onChange={(_, v) => v && setSource(v)}>
        <ToggleButton value="google">Google Fonts</ToggleButton><ToggleButton value="upload">Upload file</ToggleButton>
      </ToggleButtonGroup>
      <TextField size="small" label={source === 'google' ? 'Google font name (e.g. DM Sans)' : 'Family name'} value={family} onChange={(e) => setFamily(e.target.value)} />
      {source === 'upload' && (
        <>
          <Button variant="outlined" onClick={() => pick.current?.click()}>{file ? `Chosen: ${file.name}` : 'Choose font file (OTF, TTF, WOFF, WOFF2)'}</Button>
          <input ref={pick} type="file" accept=".otf,.ttf,.woff,.woff2" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            setFile({ name: f.name, mime: f.type || 'font/ttf', dataUrl: await readData(f) })
            if (!family.trim()) setFamily(f.name.replace(/\.[^.]+$/, ''))
          }} />
        </>
      )}
      <Button variant="contained" disabled={!ok} onClick={add}>Add font family</Button>
    </Box>
  )
}

export function FontsSection() {
  const t = useStore(getTheme)
  return (
    <Sec title="Fonts" count={t.fonts.length} help="Font families your text styles pick from. Add Google fonts or upload your own files. The Main font is the default for the whole page.">
      {t.fonts.map((f) => <FontCard key={f.id} f={f} t={t} />)}
      <AddFont t={t} />
    </Sec>
  )
}

function StyleFields({ s, t, onChange }: { s: Omit<TextStyle, 'id' | 'name'>; t: Theme; onChange: (p: Partial<TextStyle>) => void }) {
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <TextField select size="small" label="Font" value={s.fontId} onChange={(e) => onChange({ fontId: e.target.value })}>
          {t.fonts.map((f) => <MenuItem key={f.id} value={f.id}>{f.family}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Weight" value={s.weight} onChange={(e) => onChange({ weight: Number(e.target.value) })}>
          {WEIGHTS.map(([w, n]) => <MenuItem key={w} value={w}>{w} {n}</MenuItem>)}
        </TextField>
        <RemField label="Size" allowEmpty={false} value={s.size} onChange={(v) => v !== undefined && onChange({ size: v })} />
        <TextField size="small" label="Line height" type="number" value={s.lineHeight} slotProps={{ htmlInput: { step: 0.05, min: 0.5 } }} onChange={(e) => onChange({ lineHeight: Number(e.target.value) })} />
        <RemField label="Letter spacing" allowEmpty={false} value={s.letterSpacing} onChange={(v) => v !== undefined && onChange({ letterSpacing: v })} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControlLabel label="UPPERCASE" control={<Switch size="small" checked={!!s.uppercase} onChange={(e) => onChange({ uppercase: e.target.checked })} />} />
        <FormControlLabel label="Italic" control={<Switch size="small" checked={!!s.italic} onChange={(e) => onChange({ italic: e.target.checked })} />} />
      </Box>
    </>
  )
}

const Sample = ({ t, s, text }: { t: Theme; s: TextStyle; text?: string }) => (
  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
    <Box sx={{ ...textCss(t, s), color: 'text.primary', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{text ?? `${s.name}: The quick brown fox jumps over the lazy dog`}</Box>
  </Box>
)

function StyleCard({ s, t }: { s: TextStyle; t: Theme }) {
  const def = defaults().text.find((d) => d.id === s.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(s)
  const set = (p: Partial<TextStyle>) => updateTheme((x) => ({ ...x, text: x.text.map((y) => (y.id === s.id ? { ...y, ...p } : y)) }))
  return (
    <Fold header={
      <>
        <TextField size="small" variant="standard" value={s.name} onChange={(e) => set({ name: e.target.value })} sx={{ minWidth: '6rem', flex: 1 }} slotProps={{ input: { sx: { fontWeight: 600 } } }} />
        <Typography variant="caption" color="text.secondary">{toCss(s.size)}</Typography>
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <IconButton size="small" disabled={s.id === 'body1'} onClick={() => updateTheme((x) => ({ ...x, text: x.text.filter((y) => y.id !== s.id) }))} aria-label="delete text style"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <TextField size="small" label="Description" value={s.description ?? ''} placeholder="Where is this used?" onChange={(e) => set({ description: e.target.value })} />
      <StyleFields s={s} t={t} onChange={set} />
      <Sample t={t} s={s} />
    </Fold>
  )
}

function AddStyle({ t }: { t: Theme }) {
  const base = t.text.find((x) => x.id === 'body1') ?? t.text[0]
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [s, setS] = useState<Omit<TextStyle, 'id' | 'name'>>({ fontId: base.fontId, size: rem(1.5), weight: 400, lineHeight: 1.3, letterSpacing: 0 })
  const draft: TextStyle = { ...s, id: 'draft', name: name || 'New style' }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">Add a text style</Typography>
      <TextField size="small" label="Name (e.g. Heading 1 Serif)" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <StyleFields s={s} t={t} onChange={(p) => setS({ ...s, ...p })} />
      <Sample t={t} s={draft} />
      <Button variant="contained" disabled={!name.trim()} onClick={() => { updateTheme((x) => ({ ...x, text: [...x.text, { ...s, id: slug(name, x.text.map((y) => y.id)), name: name.trim(), description: description.trim() || undefined }] })); setName(''); setDescription('') }}>Add text style</Button>
    </Box>
  )
}

export function TextStylesSection() {
  const t = useStore(getTheme)
  return (
    <Sec title="Text styles" count={t.text.length} help="Each style is named for what it styles. Change any value and the sample updates. To use a different font for the same kind of heading, add a named alternate, for example Heading 1 Serif.">
      {t.text.map((s) => <StyleCard key={s.id} s={s} t={t} />)}
      <AddStyle t={t} />
    </Sec>
  )
}
