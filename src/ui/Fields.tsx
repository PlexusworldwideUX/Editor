import { useEffect, useState, type ReactNode } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { snapRem, toCss, type Ticks } from '../model/rem'
import type { Sizing } from '../model/types'

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box sx={{ py: 1.5, borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
    <Typography variant="overline" sx={{ display: 'block', mb: 1, lineHeight: 1.5 }}>{title}</Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</Box>
  </Box>
)

/** rem input. Accepts values with up to 4 decimals ending in 0 or 5. Arrow keys step 0.25rem. */
export function RemField({ label, value, onChange, placeholder, allowEmpty = true, width, tokens }: {
  label: string; value: Ticks | undefined; onChange: (v: Ticks | undefined) => void; placeholder?: string; allowEmpty?: boolean; width?: string
  tokens?: { name: string; value: Ticks }[]
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const shown = value === undefined ? '' : toCss(value).replace('rem', '')
  const [text, setText] = useState(shown)
  const [bad, setBad] = useState(false)
  useEffect(() => { setText(shown); setBad(false) }, [shown])
  const commit = (t: string) => {
    if (t.trim() === '') { if (allowEmpty) { onChange(undefined); setBad(false) } else setBad(true); return }
    const v = snapRem(t)
    if (v === null) setBad(true)
    else { setBad(false); setText(toCss(v).replace('rem', '')); onChange(v) } // show the corrected value
  }
  return (
    <TextField size="small" label={label} value={text} placeholder={placeholder} error={bad} sx={{ width }}
      helperText={bad ? 'Enter a number' : undefined}
      slotProps={{ input: { endAdornment: (<>
        <Typography variant="caption" color="text.secondary">rem</Typography>
        {!!tokens?.length && <><IconButton size="small" aria-label="spacing tokens" onClick={(e) => setAnchor(e.currentTarget)}><ArrowDropDown fontSize="small" /></IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>{tokens.map((t) => <MenuItem key={t.name} onClick={() => { onChange(t.value); setAnchor(null) }}>{t.name}: {toCss(t.value)}</MenuItem>)}</Menu></>}
      </>) } }}
      onChange={(e) => { setText(e.target.value); if (bad) setBad(false) }}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(text)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const cur = snapRem(text) ?? 0
          const next = Math.max(0, cur + (e.key === 'ArrowUp' ? 500 : -500))
          setText(toCss(next).replace('rem', '')); onChange(next)
        }
      }} />
  )
}

export function SizingField({ label, value, onChange }: { label: string; value: Sizing | undefined; onChange: (v: Sizing | undefined) => void }) {
  const mode = value?.mode ?? 'auto'
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <ToggleButtonGroup size="small" exclusive value={mode} sx={{ '& .MuiToggleButton-root': { px: 1, textTransform: 'none' } }}
        onChange={(_, m) => {
          if (!m) return
          if (m === 'fixed') onChange({ mode: 'fixed', value: value?.mode === 'fixed' ? value.value : 8000 })
          else onChange({ mode: m })
        }}>
        <ToggleButton value="auto">Auto</ToggleButton>
        <ToggleButton value="hug">Hug</ToggleButton>
        <ToggleButton value="fill">Fill</ToggleButton>
        <ToggleButton value="fixed">Fixed</ToggleButton>
      </ToggleButtonGroup>
      {value?.mode === 'fixed' && <RemField label={label} allowEmpty={false} width="7rem" value={value.value} onChange={(v) => v !== undefined && onChange({ mode: 'fixed', value: v })} />}
    </Box>
  )
}

/** 3x3 alignment matrix like Figma's auto layout. */
export function AlignMatrix({ x, y, onChange }: { x: 'start' | 'center' | 'end'; y: 'start' | 'center' | 'end'; onChange: (x: 'start' | 'center' | 'end', y: 'start' | 'center' | 'end') => void }) {
  const o = ['start', 'center', 'end'] as const
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 2rem)', gridTemplateRows: 'repeat(3, 2rem)', border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1 }}>
      {o.flatMap((yy) => o.map((xx) => (
        <Box key={`${xx}${yy}`} onClick={() => onChange(xx, yy)} role="button" aria-label={`align ${yy} ${xx}`}
          sx={{ display: 'grid', placeItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
          <Box sx={{ width: x === xx && y === yy ? '0.75rem' : '0.25rem', height: x === xx && y === yy ? '0.75rem' : '0.25rem', borderRadius: '50%', bgcolor: x === xx && y === yy ? 'primary.main' : 'text.disabled' }} />
        </Box>
      )))}
    </Box>
  )
}

export interface Swatch { value: string; label: string; color: string }

/** Colour chooser that shows the current swatch and every available choice as swatches. */
export function SwatchSelect({ label, value, options, onChange, allowNone = true }: {
  label: string; value: string; options: Swatch[]; onChange: (v: string) => void; allowNone?: boolean
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const cur = options.find((o) => o.value === value)
  const chip = (color: string | null, selected: boolean) => (
    <Box sx={{
      width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem', flexShrink: 0, boxSizing: 'border-box',
      border: selected ? '0.125rem solid #0b57d0' : '0.0625rem solid rgba(0,0,0,.25)',
      background: color ?? 'linear-gradient(to top right, transparent calc(50% - 0.0625rem), #d32f2f, transparent calc(50% + 0.0625rem)), #fff',
    }} />
  )
  return (
    <>
      <Box role="button" tabIndex={0} onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { borderColor: 'text.primary' } }}>
        {chip(cur?.color ?? null, false)}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{label}</Typography>
          <Typography variant="body2" noWrap color={value && !cur ? 'error' : undefined}>{cur?.label ?? (value ? `${value} (not allowed here)` : 'None')}</Typography>
        </Box>
        <ArrowDropDown fontSize="small" />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { p: 1.5, width: '16rem' } } }} MenuListProps={{ disablePadding: true }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {allowNone && (
            <Box title="None" onClick={() => { onChange(''); setAnchor(null) }} sx={{ cursor: 'pointer' }}>
              <Box sx={{ transform: 'scale(1.5)', m: 0.5 }}>{chip(null, !value)}</Box>
            </Box>
          )}
          {options.map((o) => (
            <Box key={o.value} title={`${o.label} ${o.color}`} onClick={() => { onChange(o.value); setAnchor(null) }} sx={{ cursor: 'pointer' }}>
              <Box sx={{ transform: 'scale(1.5)', m: 0.5 }}>{chip(o.color, o.value === value)}</Box>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{cur ? `${cur.label} ${cur.color}` : 'None'}</Typography>
      </Menu>
    </>
  )
}

/** Colour input: a large swatch (opens the colour picker) plus a hex field. */
export function ColorInput({ value, onChange, label, compact }: { value: string; onChange: (hex: string) => void; label?: string; compact?: boolean }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const ok = /^#[0-9a-fA-F]{6}$/.test(text)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box component="label" sx={{ width: '2.25rem', height: '2.25rem', borderRadius: 1, border: '0.0625rem solid rgba(0,0,0,.3)', bgcolor: value, cursor: 'pointer', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
        <input type="color" value={ok ? text : value} onChange={(e) => onChange(e.target.value)} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
      </Box>
      <TextField size="small" label={compact ? undefined : (label ?? 'Hex')} placeholder="#rrggbb" value={text} error={!ok} sx={{ width: compact ? '6.5rem' : '8rem', flexShrink: 0 }}
        onChange={(e) => { setText(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toLowerCase()) }} />
    </Box>
  )
}
