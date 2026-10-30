import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Home from '@mui/icons-material/Home'
import LightMode from '@mui/icons-material/LightMode'
import DarkMode from '@mui/icons-material/DarkMode'
import { toCss } from '../model/rem'
import { SURFACE_ROLES, TONES, radiusValue, shadowValue, type ColorGroup, type Theme } from '../model/theme'
import { StateRows } from './theme/Buttons'

const H = ({ children }: { children: React.ReactNode }) => <Typography variant="overline" sx={{ display: 'block', mt: 4, mb: 1, color: 'text.secondary' }}>{children}</Typography>
const Tag = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" sx={{ display: 'inline-block', px: 0.75, py: 0.125, borderRadius: 0.5, bgcolor: 'action.hover', color: 'text.secondary', mb: 0.5 }}>{children}</Typography>
)

function Swatches({ theme, mode, group }: { theme: Theme; mode: 'light' | 'dark'; group: ColorGroup }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {theme.colors.filter((c) => c.group === group).map((c) => (
        <Box key={c.id} sx={{ width: '8rem' }}>
          <Box sx={{ height: '3rem', bgcolor: c[mode], borderRadius: 1, border: '0.0625rem solid', borderColor: 'divider' }} />
          <Typography variant="caption" sx={{ display: 'block' }}>{c.name}</Typography>
          {c.role && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{SURFACE_ROLES.find((r) => r.role === c.role)?.label}</Typography>}
          <Typography variant="caption" display="block" color="text.secondary">{c[mode]}</Typography>
          {c.tones && <Box sx={{ display: 'flex', mt: 0.5 }}>{TONES.map((t) => <Box key={t} title={`${c.name} ${t}`} sx={{ flex: 1, height: '0.75rem', bgcolor: c.tones![String(t)] }} />)}</Box>}
        </Box>
      ))}
    </Box>
  )
}

/** Live preview shown on the canvas while editing theme tokens: an example page built from the masters, then every token. */
export function KitchenSink({ theme, mode }: { theme: Theme; mode: 'light' | 'dark' }) {
  const surface = (role: string) => theme.colors.find((c) => c.role === role)
  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', color: 'text.primary', minHeight: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1.5, py: 0.75, borderRadius: 5, width: 'fit-content', bgcolor: mode === 'light' ? 'action.hover' : 'action.selected', border: '0.0625rem solid', borderColor: 'divider' }}>
        {mode === 'light' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        <Typography variant="caption" sx={{ fontWeight: 700 }}>LIVE PREVIEW · {mode.toUpperCase()} MODE</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">Every item is a real element drawn from the theme. Switch Light and Dark at the top of the theme panel. Edit a token and this updates.</Typography>

      <H>Example page</H>
      <Typography variant="h3">Feel your best</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>A lead-in line under the title</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: radiusValue(theme, 'card'), boxShadow: shadowValue(theme, 'sm'), p: 3 }}>
          <Tag>Surface: {surface('card')?.name ?? 'Card'}</Tag>
          <Typography variant="h6">Card title</Typography>
          <Typography variant="body1" sx={{ my: 1 }}>This is your normal body text on a card.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Secondary details and table text.</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {theme.buttons.styles.map((b) => <Button key={b.id} variant={b.id as 'contained'}>{b.name}</Button>)}
          </Box>
        </Box>
        <Dialog elevation={0} sx={{ p: 3, bgcolor: surface('dialog')?.[mode], borderRadius: radiusValue(theme, 'card'), boxShadow: shadowValue(theme, 'l8') }}>
          <Tag>Surface: {surface('dialog')?.name ?? 'Dialog'}</Tag>
          <Typography variant="overline" sx={{ display: 'block' }}>Sign up</Typography>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Email</Typography>
          <Tag>Input surface: {surface('input')?.name ?? 'Input'}</Tag>
          <TextField fullWidth size="small" placeholder="name@example.com" sx={{ mb: 2, display: 'block' }} />
          {(['alertError', 'alertInfo', 'alertSuccess', 'alertWarning'] as const).map((r) => (
            <Box key={r} sx={{ mb: 1 }}>
              <Tag>Surface: {surface(r)?.name}</Tag>
              <Alert severity={r === 'alertError' ? 'error' : r === 'alertInfo' ? 'info' : r === 'alertSuccess' ? 'success' : 'warning'}>{SURFACE_ROLES.find((x) => x.role === r)?.label} message example</Alert>
            </Box>
          ))}
        </Dialog>
      </Box>

      <H>Colours</H><Swatches theme={theme} mode={mode} group="colour" />
      <H>Surfaces</H><Swatches theme={theme} mode={mode} group="surface" />

      <H>Text styles</H>
      {theme.text.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ width: '9rem', flexShrink: 0 }}>{s.name} {toCss(s.size)}</Typography>
          <Typography variant={s.id as 'h1'} noWrap sx={{ minWidth: 0 }}>The quick brown fox</Typography>
        </Box>
      ))}

      <H>Button styles and states</H>
      {theme.buttons.styles.map((b) => (
        <Box key={b.id} sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">{b.name}</Typography>
          <StateRows theme={theme} style={b} />
        </Box>
      ))}

      <H>Radius</H>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {theme.radius.map((r) => (
          <Box key={r.id} sx={{ textAlign: 'center' }}>
            <Box sx={{ width: '5rem', height: '3rem', bgcolor: 'primary.main', borderRadius: radiusValue(theme, r.id) }} />
            <Typography variant="caption">{r.name} {toCss(r.value)}</Typography>
          </Box>
        ))}
      </Box>

      <H>Spacing (1 step = {toCss(theme.spacingUnit)})</H>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {theme.spacing.map((s) => (
          <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ width: '8rem' }}>{s.name} {toCss(s.value)}</Typography>
            <Box sx={{ width: toCss(s.value), maxWidth: '100%', height: '1rem', bgcolor: 'secondary.main' }} />
          </Box>
        ))}
      </Box>

      <H>Shadows</H>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', p: 2 }}>
        {theme.shadows.map((s) => (
          <Box key={s.id} sx={{ width: '7rem', height: '5rem', bgcolor: 'background.paper', borderRadius: 1, boxShadow: shadowValue(theme, s.id), display: 'grid', placeItems: 'center' }}>
            <Typography variant="caption">{s.name}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, color: 'primary.main' }}><Home /></Box>
    </Box>
  )
}
