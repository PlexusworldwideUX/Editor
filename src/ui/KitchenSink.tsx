import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Home from '@mui/icons-material/Home'
import Favorite from '@mui/icons-material/Favorite'
import Settings from '@mui/icons-material/Settings'
import { toCss } from '../model/rem'
import { radiusValue, shadowValue, type ColorGroup, type Theme } from '../model/theme'

const H = ({ children }: { children: React.ReactNode }) => <Typography variant="overline" sx={{ display: 'block', mt: 4, mb: 1, color: 'text.secondary' }}>{children}</Typography>

function Swatches({ theme, mode, group }: { theme: Theme; mode: 'light' | 'dark'; group: ColorGroup }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {theme.colors.filter((c) => c.group === group).map((c) => (
        <Box key={c.id} sx={{ width: '7rem' }}>
          <Box sx={{ height: '3rem', bgcolor: c[mode], borderRadius: 1, border: '0.0625rem solid', borderColor: 'divider' }} />
          <Typography variant="caption">{c.name}</Typography>
          <Typography variant="caption" display="block" color="text.secondary">{c[mode]}</Typography>
        </Box>
      ))}
    </Box>
  )
}

/** Live preview shown on the canvas while editing theme tokens. */
export function KitchenSink({ theme, mode }: { theme: Theme; mode: 'light' | 'dark' }) {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', color: 'text.primary', minHeight: '100%' }}>
      <Typography variant="overline" color="error">Live preview</Typography>
      <Typography variant="body2" color="text.secondary">Every item uses the theme tokens. Edit tokens on the right and this updates immediately.</Typography>

      <H>Colours</H><Swatches theme={theme} mode={mode} group="colour" />
      <H>Surfaces</H><Swatches theme={theme} mode={mode} group="surface" />

      <H>Text styles</H>
      {theme.text.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ width: '8rem', flexShrink: 0 }}>{s.name} {toCss(s.size)}</Typography>
          <Typography variant={s.id as 'h1'} noWrap sx={{ minWidth: 0 }}>The quick brown fox</Typography>
        </Box>
      ))}

      <H>Buttons</H>
      {(['contained', 'outlined', 'text'] as const).map((v) => (
        <Box key={v} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['small', 'medium', 'large'] as const).map((s) => <Button key={s} variant={v} size={s}>{v} {s}</Button>)}
          <Button variant={v} color="secondary">Secondary</Button>
          <Button variant={v} startIcon={<Home />}>With icon</Button>
          <Button variant={v} disabled>Disabled</Button>
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

      <H>Form and messages</H>
      <Box sx={{ maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Email" size="small" placeholder="name@example.com" />
        <Alert severity="error">Error message example</Alert>
        <Alert severity="info">Info message example</Alert>
        <Alert severity="success">Success message example</Alert>
        <Alert severity="warning">Warning message example</Alert>
        <Box sx={{ display: 'flex', gap: 2 }}><Home color="primary" /><Favorite color="error" /><Settings color="action" /></Box>
      </Box>
    </Box>
  )
}
