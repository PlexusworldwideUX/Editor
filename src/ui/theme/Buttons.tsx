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
import { getTheme, updateTheme, useStore } from '../../store'
import {
  BUTTON_STATES, newButtonStyle, radiusValue, roleValue, rolesFor, slug, textCss,
  type ButtonState, type ButtonStateId, type ButtonStyle, type ButtonVariantId, type Theme,
} from '../../model/theme'
import { ChangedChip, ColourPick, Fold, Hint, Sec, defaults } from './common'
import { RemField } from '../Fields'

const STATE_LABEL: Record<ButtonStateId, string> = { enabled: 'Enabled', hover: 'Hover', pressed: 'Pressed', focused: 'Focused', disabled: 'Disabled' }
const KIND_LABEL: Record<ButtonVariantId, string> = { contained: 'Filled', outlined: 'Outline', text: 'Text only' }

/** A button drawn in one state and mode, straight from the theme's roles (no MUI needed, so every state can show at once). */
export function ButtonPreview({ theme, style, mode, state, label }: { theme: Theme; style: ButtonStyle; mode: 'light' | 'dark'; state: ButtonStateId; label?: string }) {
  const tok = theme.colors.find((c) => c.id === style.colorId) ?? theme.colors[0]
  const roles = rolesFor(style, mode)
  const st = roles[state]
  const ts = theme.text.find((s) => s.id === style.textStyle)
  const ring = state === 'focused' ? roleValue(theme, tok, mode, st.border, 'border') : undefined
  return (
    <Box component="span" sx={{
      display: 'inline-block', px: 1.5, py: 0.5, boxSizing: 'border-box', whiteSpace: 'nowrap',
      ...(ts ? textCss(theme, ts) : {}), fontSize: '0.8125rem',
      borderRadius: radiusValue(theme, style.radius), borderStyle: 'solid', borderWidth: '0.0625rem',
      backgroundColor: roleValue(theme, tok, mode, st.fill, 'fill'), color: roleValue(theme, tok, mode, st.text, 'text'),
      borderColor: state === 'focused' ? roleValue(theme, tok, mode, roles.enabled.border, 'border') : roleValue(theme, tok, mode, st.border, 'border'),
      outline: ring ? `0.125rem solid ${ring}` : undefined, outlineOffset: ring ? '0.125rem' : undefined,
    }}>{label ?? STATE_LABEL[state]}</Box>
  )
}

/** Every state of a style, in Light and Dark, each row labelled with the mode it shows. */
export function StateRows({ theme, style }: { theme: Theme; style: ButtonStyle }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {(['light', 'dark'] as const).map((m) => {
        const bg = theme.colors.find((c) => c.role === 'page')?.[m] ?? theme.colors.find((c) => c.id === 'background')![m]
        const fg = m === 'light' ? '#444' : '#ddd'
        return (
          <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1, borderRadius: 1, bgcolor: bg, border: '0.0625rem solid rgba(0,0,0,.12)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '4.5rem', color: fg }}>
              {m === 'light' ? <LightMode sx={{ fontSize: '1rem' }} /> : <DarkMode sx={{ fontSize: '1rem' }} />}
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{m === 'light' ? 'Light' : 'Dark'}</Typography>
            </Box>
            {BUTTON_STATES.map((s) => <Box key={s} sx={{ m: '0.25rem' }}><ButtonPreview theme={theme} style={style} mode={m} state={s} /></Box>)}
          </Box>
        )
      })}
    </Box>
  )
}

function ColourSelect({ value, onChange, theme }: { value: string; onChange: (id: string) => void; theme: Theme }) {
  return (
    <TextField select size="small" label="Colour of this button" value={value} onChange={(e) => onChange(e.target.value)}>
      {theme.colors.filter((c) => c.group === 'colour' && c.tones).map((c) => (
        <MenuItem key={c.id} value={c.id}><Box sx={{ display: 'inline-block', width: '0.875rem', height: '0.875rem', borderRadius: 0.5, bgcolor: c.light, mr: 1, border: '0.0625rem solid rgba(0,0,0,.25)', verticalAlign: 'middle' }} />{c.name}</MenuItem>
      ))}
    </TextField>
  )
}

/**
 * Fill, text and border of every state, for the mode being edited. Every cell is a pick from the theme.
 * In Dark, a cell follows Light automatically until you pick something else for it.
 */
function ModeTable({ v, theme }: { v: ButtonStyle; theme: Theme }) {
  const mode = useStore((s) => s.mode)
  const tok = theme.colors.find((c) => c.id === v.colorId) ?? theme.colors[0]
  const set = (patch: Partial<ButtonStyle>) => updateTheme((x) => ({ ...x, buttons: { ...x.buttons, styles: x.buttons.styles.map((y) => (y.id === v.id ? { ...y, ...patch } : y)) } }))
  const setPick = (state: ButtonStateId, part: keyof ButtonState, value: string) => {
    if (mode === 'light') set({ light: { ...v.light, [state]: { ...v.light[state], [part]: value } } })
    else set({ dark: { ...v.dark, [state]: { ...v.dark?.[state], [part]: value } } })
  }
  const reset = (state: ButtonStateId, part: keyof ButtonState) => {
    const cell = { ...v.dark?.[state] }
    delete cell[part]
    set({ dark: { ...v.dark, [state]: cell } })
  }
  const roles = rolesFor(v, mode)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: mode === 'light' ? 'action.hover' : 'grey.900', color: mode === 'light' ? 'text.primary' : 'grey.100' }}>
        {mode === 'light' ? <LightMode sx={{ fontSize: '1rem' }} /> : <DarkMode sx={{ fontSize: '1rem' }} />}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Editing the {mode === 'light' ? 'LIGHT' : 'DARK'} look</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>{mode === 'dark' ? 'Auto cells follow Light. Pick one to override just that cell.' : 'Switch to Dark at the top of the panel to override it there.'}</Typography>
      </Box>
      {BUTTON_STATES.map((s) => (
        <Box key={s} sx={{ border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>{STATE_LABEL[s]}</Typography>
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: theme.colors.find((c) => c.role === 'page')?.[mode] }}><ButtonPreview theme={theme} style={v} mode={mode} state={s} /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            {(['fill', 'text', 'border'] as const).map((part) => {
              const overridden = mode === 'dark' && v.dark?.[s]?.[part] !== undefined
              return (
                <ColourPick key={part} label={part === 'fill' ? 'Fill' : part === 'text' ? 'Text' : 'Border'} theme={theme} token={tok} mode={mode} part={part}
                  value={roles[s][part]} auto={mode === 'dark' && !overridden} onChange={(val) => setPick(s, part, val)} onReset={overridden ? () => reset(s, part) : undefined} />
              )
            })}
          </Box>
        </Box>
      ))}
      <Hint>Each choice comes from your theme: this button's own tones (Main, Light, Dark, Tint, Text on, Muted), any tone of any colour, any surface, white or black. These states become real hover, pressed, focused and disabled styles in the exported theme.</Hint>
    </Box>
  )
}

function StyleCard({ v, canDelete }: { v: ButtonStyle; canDelete: boolean }) {
  const theme = useStore(getTheme)
  const def = defaults().buttons.styles.find((d) => d.id === v.id)
  const changed = !!def && JSON.stringify(def) !== JSON.stringify(v)
  const set = (patch: Partial<ButtonStyle>) => updateTheme((x) => ({ ...x, buttons: { ...x.buttons, styles: x.buttons.styles.map((y) => (y.id === v.id ? { ...y, ...patch } : y)) } }))
  return (
    <Fold defaultOpen={v.id === 'primary'} header={
      <>
        <TextField size="small" variant="standard" value={v.name} onChange={(e) => set({ name: e.target.value })} sx={{ minWidth: '5rem', flex: 1 }} slotProps={{ input: { sx: { fontWeight: 600 } } }} />
        <Chip size="small" label={KIND_LABEL[v.kind]} sx={{ height: '1.25rem' }} />
        <ChangedChip show={changed} onReset={() => def && set(def)} />
        <ButtonPreview theme={theme} style={v} mode="light" state="enabled" label={v.name} />
        <IconButton size="small" disabled={!canDelete} onClick={() => updateTheme((x) => ({ ...x, buttons: { ...x.buttons, styles: x.buttons.styles.filter((y) => y.id !== v.id) } }))} aria-label="delete button style"><Delete fontSize="small" /></IconButton>
      </>
    }>
      <StateRows theme={theme} style={v} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <ColourSelect value={v.colorId} onChange={(id) => set({ colorId: id })} theme={theme} />
        <TextField select size="small" label="Style of button" value={v.kind} onChange={(e) => { const kind = e.target.value as ButtonVariantId; set({ kind, light: structuredClone(newButtonStyle(v.id, v.name, kind, v.colorId).light), dark: undefined, shadow: kind === 'contained' ? 'sm' : 'none' }) }}>
          {(Object.keys(KIND_LABEL) as ButtonVariantId[]).map((k) => <MenuItem key={k} value={k}>{KIND_LABEL[k]}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Corner radius" value={v.radius} onChange={(e) => set({ radius: e.target.value })}>
          {theme.radius.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Text style" value={v.textStyle} onChange={(e) => set({ textStyle: e.target.value })}>
          {theme.text.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Shadow" value={v.shadow} onChange={(e) => set({ shadow: e.target.value })}>
          {theme.shadows.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </Box>

      <ModeTable v={v} theme={theme} />
    </Fold>
  )
}

function AddStyle({ theme }: { theme: Theme }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ButtonVariantId>('contained')
  const [colorId, setColorId] = useState('primary')
  const [radius, setRadius] = useState('control')
  const add = () => {
    updateTheme((x) => ({ ...x, buttons: { ...x.buttons, styles: [...x.buttons.styles, newButtonStyle(slug(name, x.buttons.styles.map((s) => s.id)), name.trim(), kind, colorId, radius)] } }))
    setName('')
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '0.0625rem dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">Add a button style</Typography>
      <TextField size="small" label="Name (e.g. Danger, Call to action)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <TextField select size="small" label="Style of button" value={kind} onChange={(e) => setKind(e.target.value as ButtonVariantId)}>
          {(Object.keys(KIND_LABEL) as ButtonVariantId[]).map((k) => <MenuItem key={k} value={k}>{KIND_LABEL[k]}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Corner radius" value={radius} onChange={(e) => setRadius(e.target.value)}>
          {theme.radius.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
        </TextField>
      </Box>
      <ColourSelect value={colorId} onChange={setColorId} theme={theme} />
      <Button variant="contained" disabled={!name.trim()} onClick={add}>Add button style</Button>
    </Box>
  )
}

export function ButtonsSection() {
  const theme = useStore(getTheme)
  const b = theme.buttons
  const dp = defaults().buttons.pad
  return (
    <Sec title="Buttons" count={b.styles.length} help="Your named button styles. Each one shows every state in Light and Dark. Add as many as you need; a Button on the canvas picks one by name, and the exported code uses the same names.">
      {b.styles.map((s) => <StyleCard key={s.id} v={s} canDelete={b.styles.length > 1} />)}
      <AddStyle theme={theme} />
      <Fold header={<><Typography variant="subtitle2">Button sizes</Typography><ChangedChip show={JSON.stringify(dp) !== JSON.stringify(b.pad)} onReset={() => updateTheme((x) => ({ ...x, buttons: { ...x.buttons, pad: dp } }))} /></>}>
        {(['small', 'medium', 'large'] as const).map((sz) => (
          <Box key={sz} sx={{ display: 'grid', gridTemplateColumns: '5rem 1fr 1fr', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption">{sz}</Typography>
            <RemField label="Padding up/down" allowEmpty={false} value={b.pad[sz].y} onChange={(v) => v !== undefined && updateTheme((x) => ({ ...x, buttons: { ...x.buttons, pad: { ...x.buttons.pad, [sz]: { ...x.buttons.pad[sz], y: v } } } }))} />
            <RemField label="Padding left/right" allowEmpty={false} value={b.pad[sz].x} onChange={(v) => v !== undefined && updateTheme((x) => ({ ...x, buttons: { ...x.buttons, pad: { ...x.buttons.pad, [sz]: { ...x.buttons.pad[sz], x: v } } } }))} />
          </Box>
        ))}
      </Fold>
    </Sec>
  )
}
