import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ICON_STYLES, Icon, iconLabel, iconStyleOf, useIconData } from '../render/icons'

export function IconPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (file: string) => void }) {
  const [q, setQ] = useState('')
  const [style, setStyle] = useState<(typeof ICON_STYLES)[number]>('Filled')
  const data = useIconData()
  const names = useMemo(() => (data ? Object.keys(data).sort() : []), [data])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return names.filter((f) => iconStyleOf(f) === style && (!s || iconLabel(f).toLowerCase().includes(s)))
  }, [q, style, names])
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ pt: 0 }}>
        {/* sticky header so search stays visible while scrolling */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', pt: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Icons ({names.length || '...'} total)</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label="Search" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} autoFocus />
            <TextField size="small" select label="Style" value={style} onChange={(e) => setStyle(e.target.value as typeof style)} sx={{ width: '9rem' }}>
              {ICON_STYLES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Box>
          <Typography variant="caption" color="text.secondary">{data ? `${list.length} matches${list.length > 300 ? ', showing first 300' : ''}` : 'Loading icons...'}</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(6rem, 1fr))', gap: 1 }}>
          {list.slice(0, 300).map((f) => (
            <Box key={f} onClick={() => { onPick(f); onClose() }} title={f}
              sx={{ cursor: 'pointer', textAlign: 'center', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
              <Icon name={f} sx={{ fontSize: '2rem' }} />
              <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-word', lineHeight: 1.2 }}>{iconLabel(f)}</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
