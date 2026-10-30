import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ChevronRight from '@mui/icons-material/ChevronRight'
import Undo from '@mui/icons-material/Undo'
import { ColorInput, RemField } from '../Fields'
import { getTheme, useStore } from '../../store'
import { TONES, defaultThemeFull, pickLabel, refLabel, roleValue, ROLES, type ColorToken, type Theme } from '../../model/theme'
import IconButton from '@mui/material/IconButton'

/** Expand all / Collapse all reach every fold through this epoch. */
export const FoldCtx = createContext<{ epoch: number; mode: 'open' | 'closed' | null }>({ epoch: 0, mode: null })
export function useFold(defaultOpen = false) {
  const { epoch, mode } = useContext(FoldCtx)
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { if (epoch > 0 && mode) setOpen(mode === 'open') }, [epoch, mode])
  return [open, setOpen] as const
}

export const defaults = () => defaultThemeFull()

/** Top-level section: title, count, one-line help, collapsible body. */
/** Which top-level sections were left open, so switching views doesn't fold everything back up. */
const remembered = new Map<string, boolean>()
export function Sec({ title, count, help, defaultOpen = false, children }: { title: string; count?: number; help?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpenRaw] = useFold(remembered.get(title) ?? defaultOpen)
  const setOpen = (v: boolean) => { remembered.set(title, v); setOpenRaw(v) }
  return (
    <Box sx={{ borderBottom: '0.0625rem solid', borderColor: 'divider' }}>
      <Box onClick={() => setOpen(!open)} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {count !== undefined && <Chip size="small" label={count} sx={{ height: '1.25rem' }} />}
        <Box sx={{ flex: 1 }} />
        {open ? <ExpandMore /> : <ChevronRight />}
      </Box>
      {open && (
        <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {help && <Typography variant="body2" color="text.secondary">{help}</Typography>}
          {children}
        </Box>
      )}
    </Box>
  )
}

/** A collapsible row-card: a header that stays visible and a body that unfolds. */
export function Fold({ header, children, defaultOpen = false }: { header: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useFold(defaultOpen)
  return (
    <Box sx={{ border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box onClick={() => setOpen(!open)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => { if ((e.target as HTMLElement).closest('input,button,label,textarea')) e.stopPropagation() }}>{header}</Box>
        {open ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
      </Box>
      {open && <Box sx={{ p: 1.5, pt: 1, borderTop: '0.0625rem solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>{children}</Box>}
    </Box>
  )
}

/** Shown on anything that differs from the built-in default; click to put it back. */
export function ChangedChip({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null
  return <Chip size="small" color="primary" variant="outlined" icon={<Undo />} label="Changed" onClick={(e) => { e.stopPropagation(); onReset() }} sx={{ height: '1.5rem' }} title="Reset to default" />
}

export const Hint = ({ children }: { children: ReactNode }) => <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{children}</Typography>

/** Slider plus a free-text rem field that snap to the same value. */
export function SliderRem({ label, value, onChange, min, max, step = 0.0625 }: { label: string; value: number; onChange: (ticks: number) => void; min: number; max: number; step?: number }) {
  const rem = value / 2000
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Slider size="small" value={Math.min(max, Math.max(min, rem))} min={min} max={max} step={step} onChange={(_, v) => onChange(Math.round((v as number) * 2000))} sx={{ flex: 1, minWidth: '4rem' }} aria-label={label} />
      <RemField label={label} allowEmpty={false} width="8rem" value={value} onChange={(v) => v !== undefined && onChange(v)} />
    </Box>
  )
}

/** Swatch that opens every tone of every colour, plus any custom hex. */
export function TonePicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label?: string }) {
  const theme = useStore(getTheme)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const groups = theme.colors.filter((c): c is ColorToken & { tones: Record<string, string> } => !!c.tones)
  const Sw = ({ hex, title }: { hex: string; title: string }) => (
    <Box title={`${title} ${hex}`} onClick={() => { onChange(hex); setAnchor(null) }}
      sx={{ width: '1.25rem', height: '1.25rem', bgcolor: hex, borderRadius: 0.5, cursor: 'pointer', boxSizing: 'border-box', border: hex.toLowerCase() === value.toLowerCase() ? '0.125rem solid #0b57d0' : '0.0625rem solid rgba(0,0,0,.2)', '&:hover': { transform: 'scale(1.25)' } }} />
  )
  return (
    <>
      <Box role="button" tabIndex={0} onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { borderColor: 'text.primary' } }}>
        <Box sx={{ width: '1.5rem', height: '1.5rem', bgcolor: value, borderRadius: 0.5, border: '0.0625rem solid rgba(0,0,0,.25)' }} />
        <Typography variant="body2" sx={{ flex: 1 }}>{label ? `${label} ` : ''}{value}</Typography>
        <ExpandMore fontSize="small" />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { p: 1.5, width: '22rem' } } }} MenuListProps={{ disablePadding: true }}>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, alignItems: 'center' }}><Sw hex="#ffffff" title="White" /><Sw hex="#000000" title="Black" /><Typography variant="caption" color="text.secondary">White and black</Typography></Box>
        {groups.map((g) => (
          <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="caption" sx={{ width: '5rem' }} noWrap>{g.name}</Typography>
            {TONES.map((t) => <Sw key={t} hex={g.tones[String(t)]} title={`${g.name} ${t}`} />)}
          </Box>
        ))}
        <Box sx={{ mt: 1 }}><ColorInput value={value} onChange={onChange} label="Custom hex" /></Box>
      </Menu>
    </>
  )
}

/**
 * Pick a colour for a surface from the theme's own tones (it then follows that colour when it changes),
 * or type any hex. `onPick` gets the hex plus the token reference, or no reference for a custom hex.
 */
export function RefPicker({ hex, refId, onPick }: { hex: string; refId: string | undefined; onPick: (hex: string, ref: string | undefined) => void }) {
  const theme = useStore(getTheme)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const groups = theme.colors.filter((c): c is ColorToken & { tones: Record<string, string> } => !!c.tones)
  const Sw = ({ h, r, title }: { h: string; r: string; title: string }) => (
    <Box title={`${title} ${h}`} onClick={() => { onPick(h, r); setAnchor(null) }}
      sx={{ width: '1.25rem', height: '1.25rem', bgcolor: h, borderRadius: 0.5, cursor: 'pointer', boxSizing: 'border-box', border: r === refId ? '0.125rem solid #0b57d0' : '0.0625rem solid rgba(0,0,0,.2)', '&:hover': { transform: 'scale(1.25)' } }} />
  )
  return (
    <>
      <Box role="button" tabIndex={0} onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, border: '0.0625rem solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { borderColor: 'text.primary' }, minWidth: 0 }}>
        <Box sx={{ width: '1.75rem', height: '1.75rem', bgcolor: hex, borderRadius: 0.5, border: '0.0625rem solid rgba(0,0,0,.3)', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap>{refLabel(theme, refId)}</Typography>
          <Typography variant="caption" color="text.secondary">{hex}</Typography>
        </Box>
        <ExpandMore fontSize="small" />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { p: 1.5, width: '22rem' } } }} MenuListProps={{ disablePadding: true }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Pick a tone. The surface follows that colour if you change it later.</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, alignItems: 'center' }}><Sw h="#ffffff" r="white" title="White" /><Sw h="#000000" r="black" title="Black" /><Typography variant="caption" color="text.secondary">White and black</Typography></Box>
        {groups.map((g) => (
          <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="caption" sx={{ width: '5rem' }} noWrap>{g.name}</Typography>
            {TONES.map((t) => <Sw key={t} h={g.tones[String(t)]} r={`${g.id}:${t}`} title={`${g.name} ${t}`} />)}
          </Box>
        ))}
        <Box sx={{ mt: 1 }}><ColorInput value={hex} onChange={(h) => onPick(h, undefined)} label="Or any hex" /></Box>
      </Menu>
    </>
  )
}

const CHECKER = 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 0.5rem 0.5rem'
const Chip2 = ({ hex, selected, size = '1.25rem' }: { hex: string; selected?: boolean; size?: string }) => (
  <Box sx={{ width: size, height: size, flexShrink: 0, borderRadius: 0.5, boxSizing: 'border-box', background: hex === 'transparent' ? CHECKER : hex, border: selected ? '0.125rem solid #0b57d0' : '0.0625rem solid rgba(0,0,0,.25)' }} />
)

/**
 * Choose a colour for one part of a button from the theme itself: this button's own tones, any tone of any colour,
 * any surface, white or black. `auto` means the value is inherited; picking anything overrides it and `onReset` puts it back.
 */
export function ColourPick({ label, value, onChange, theme, token, mode, part, auto, onReset }: {
  label: string; value: string; onChange: (v: string) => void; theme: Theme; token: ColorToken; mode: 'light' | 'dark'
  part: 'fill' | 'text' | 'border'; auto?: boolean; onReset?: () => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const hex = roleValue(theme, token, mode, value, part)
  const pick = (v: string) => { onChange(v); setAnchor(null) }
  const Opt = ({ v, name }: { v: string; name: string }) => {
    const h = roleValue(theme, token, mode, v, part)
    return (
      <Box onClick={() => pick(v)} title={`${name} ${h}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.5, borderRadius: 1, cursor: 'pointer', border: '0.0625rem solid', borderColor: v === value ? 'primary.main' : 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
        <Chip2 hex={h} selected={v === value} /><Typography variant="caption" noWrap>{name}</Typography>
      </Box>
    )
  }
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, mb: 0.25 }}>{label}</Typography>
      <Box role="button" tabIndex={0} onClick={(e) => setAnchor(e.currentTarget)} title={`${pickLabel(theme, value)} ${hex}${auto ? ' (automatic, follows Light)' : ''}`}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.5, border: '0.0625rem solid', borderColor: auto ? 'divider' : 'text.disabled', borderStyle: auto ? 'dashed' : 'solid', borderRadius: 1, cursor: 'pointer', minWidth: 0, '&:hover': { borderColor: 'text.primary' } }}>
        <Chip2 hex={hex} />
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', fontStyle: auto ? 'italic' : 'normal', color: auto ? 'text.secondary' : 'text.primary' }}>{pickLabel(theme, value)}</Typography>
        {!auto && onReset && <IconButton size="small" sx={{ p: 0 }} aria-label="reset to auto" title="Back to automatic" onClick={(e) => { e.stopPropagation(); onReset() }}><Undo sx={{ fontSize: '1rem' }} /></IconButton>}
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { p: 1.5, width: '25rem', maxHeight: '32rem' } } }} MenuListProps={{ disablePadding: true }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>This button's colour ({token.name})</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1.5 }}>
          {ROLES.map((r) => <Opt key={r} v={r} name={pickLabel(theme, r)} />)}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Any theme colour</Typography>
        {theme.colors.filter((c) => c.tones).map((c) => (
          <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="caption" sx={{ width: '5.5rem' }} noWrap>{c.name}</Typography>
            {TONES.map((t) => { const v = `${c.id}:${t}`; return <Box key={t} onClick={() => pick(v)} title={`${c.name} ${t} ${c.tones![String(t)]}`} sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.2)' } }}><Chip2 hex={c.tones![String(t)]} selected={v === value} size="1.1rem" /></Box> })}
          </Box>
        ))}
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 1.5, mb: 0.5 }}>Surfaces</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          {theme.colors.filter((c) => c.group === 'surface').map((c) => <Opt key={c.id} v={`surface:${c.id}`} name={c.name} />)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 1.5 }}>
          <Opt v="white" name="White" /><Opt v="black" name="Black" />
        </Box>
      </Menu>
    </Box>
  )
}
