import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { find } from '../model/tree'
import { effLayout, isOverridden } from '../model/tree'
import { colorPath } from '../model/theme'
import { KINDS, type DesignNode, type Kind, type LayoutKey } from '../model/types'
import { deleteNodes, duplicateNodes, editDefinition, getRoot, getTheme, primary, resetLayoutProp, saveAsNew, setLayoutProp, ungroup, updateNode, useStore, wrapNodes } from '../store'
import { AlignMatrix, RemField, Section, SizingField, SwatchSelect, type Swatch } from './Fields'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft'
import FormatAlignCenter from '@mui/icons-material/FormatAlignCenter'
import FormatAlignRight from '@mui/icons-material/FormatAlignRight'
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify'
import { IconPicker } from './IconPicker'
import { iconLabel } from '../render/icons'
import { PLACEHOLDER_IMG } from '../model/library'

type Opt = string | { value: string; label: string }
const Sel = ({ label, value, options, onChange }: { label: string; value: string; options: readonly Opt[]; onChange: (v: string) => void }) => (
  <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((o) => { const v = typeof o === 'string' ? o : o.value; return <MenuItem key={v} value={v}>{typeof o === 'string' ? o || 'none' : o.label}</MenuItem> })}
  </TextField>
)

function SaveAs({ node, onClose }: { node: DesignNode; onClose: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('component')
  const [err, setErr] = useState('')
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Save as new</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">Creates an editable item in the Designer tier. The original stays untouched.</Typography>
        <TextField autoFocus label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField select label="What is it?" size="small" value={kind} onChange={(e) => setKind(e.target.value as Kind)}
          helperText="Elements hold basics, components hold elements, objects hold components, layouts hold objects.">
          {KINDS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
        </TextField>
        {err && <Alert severity="error">{err}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => { const e = saveAsNew(node.id, name, kind); if (e) setErr(e); else onClose() }}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

export function Properties() {
  const root = useStore(getRoot)
  const selection = useStore((s) => s.selection)
  const selId = useStore(primary)
  const theme = useStore(getTheme)
  const bp = useStore((s) => s.bp)
  const library = useStore((s) => s.library)
  const editing = useStore((s) => s.editing)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const node = selId ? find(root, selId) : undefined
  const mode = useStore((s) => s.mode)
  const sw = (list: typeof theme.colors): Swatch[] => list.map((c) => ({ value: colorPath(c), label: c.name, color: c[mode] }))
  const surfaceSw = sw(theme.colors.filter((c) => c.group === 'surface')) // fills use surfaces only
  const colourSw = sw(theme.colors.filter((c) => c.group === 'colour')) // text and icon colours
  const anySw = sw(theme.colors) // borders may use either
  const brand: Swatch[] = theme.colors.filter((c) => ['primary', 'secondary', 'error', 'warning', 'info', 'success'].includes(c.id)).map((c) => ({ value: c.id, label: c.name, color: c[mode] }))
  const spaceTokens = theme.spacing.map((t) => ({ name: t.name, value: t.value }))

  if (selection.length > 1)
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2">{selection.length} items selected</Typography>
        <Button variant="contained" onClick={() => wrapNodes(selection)}>Group in container</Button>
        <Button variant="outlined" onClick={() => duplicateNodes(selection)}>Duplicate</Button>
        <Button variant="outlined" color="error" onClick={() => deleteNodes(selection)}>Delete</Button>
        <Typography variant="caption" color="text.secondary">Select a single item to edit its properties.</Typography>
      </Box>
    )

  if (!node) return <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Select something on the canvas, or add from the Library tab.</Typography></Box>

  const eff = effLayout(node, bp)
  const set = (k: LayoutKey, v: unknown) => setLayoutProp(node.id, k, v)
  const over = (k: LayoutKey) => isOverridden(node, bp, k)
  const isContainer = node.type === 'container'
  const item = node.type === 'instance' ? library.find((i) => i.id === node.ref) : undefined
  const p = node.props ?? {}
  const setProp = (k: string, v: string | number | boolean | undefined) =>
    updateNode(node.id, (n) => { const props = { ...n.props }; if (v === undefined || v === '') delete props[k]; else props[k] = v; return { ...n, props } })
  const setStyle = (k: string, v: string | number | undefined) =>
    updateNode(node.id, (n) => { const style = { ...n.style } as Record<string, unknown>; if (v === undefined || v === '') delete style[k]; else style[k] = v; return { ...n, style } })
  const pad = eff.padding ?? { top: 0, right: 0, bottom: 0, left: 0 }
  const reset = (k: LayoutKey) => over(k) && <Chip size="small"  label={`custom for ${bp}: reset to mobile`} onClick={() => resetLayoutProp(node.id, k)} sx={{ alignSelf: 'flex-start' }} />

  return (
    <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
      <Typography variant="subtitle2">{item?.name ?? node.name ?? node.type}</Typography>
      <Typography variant="caption" color="text.secondary">
        {bp === 'mobile'
          ? 'Mobile is the base. Tablet and desktop follow it until you customise them.'
          : `Changes here apply to ${bp} only. Anything you don't change follows mobile.`}
      </Typography>
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" onClick={() => setSaving(true)}>Save as new</Button>
        {item && <Button size="small" variant="outlined" onClick={() => editDefinition(item.id)}>Edit definition</Button>}
        {node.type === 'container' && node.id !== root.id && <Button size="small" variant="outlined" onClick={() => ungroup(node.id)}>Ungroup</Button>}
      </Box>
      {node.type === 'instance' && !item && <Alert severity="warning" sx={{ mt: 1 }}>Library item missing. It was deleted or not imported. Replace it or re-import the project file.</Alert>}
      {editing && node.id === root.id && <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>This is the root of the item being edited.</Typography>}

      {node.type === 'text' && (
        <Section title="Text">
          <TextField size="small" label="Content" multiline value={String(p.text ?? '')} onChange={(e) => setProp('text', e.target.value)} />
          <Sel label="Text style (from theme)" value={String(p.variant ?? 'body1')} options={theme.text.map((t) => ({ value: t.id, label: t.name }))} onChange={(v) => setProp('variant', v)} />
        </Section>
      )}
      {node.type === 'button' && (
        <Section title="Button">
          <TextField size="small" label="Label" value={String(p.text ?? '')} onChange={(e) => setProp('text', e.target.value)} />
          <Sel label="Variant" value={String(p.variant ?? 'contained')} options={['contained', 'outlined', 'text']} onChange={(v) => setProp('variant', v)} />
          <SwatchSelect label="Colour" allowNone={false} value={String(p.color ?? 'primary')} options={brand} onChange={(v) => setProp('color', v)} />
          <Sel label="Size" value={String(p.size ?? 'medium')} options={['small', 'medium', 'large']} onChange={(v) => setProp('size', v)} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setPicking(true)}>{p.icon ? `Icon: ${iconLabel(String(p.icon))}` : 'Add icon'}</Button>
            {p.icon && <Button size="small" onClick={() => setProp('icon', undefined)}>Remove</Button>}
          </Box>
        </Section>
      )}
      {node.type === 'icon' && (
        <Section title="Icon">
          <Button size="small" variant="outlined" onClick={() => setPicking(true)}>{iconLabel(String(p.icon ?? 'Home'))}</Button>
          <RemField label="Size" allowEmpty={false} value={Number(p.size ?? 3000)} onChange={(v) => v !== undefined && setProp('size', v)} />
        </Section>
      )}
      {node.type === 'image' && (
        <Section title="Image">
          <TextField size="small" label="Image URL" value={String(p.src ?? '').startsWith('data:') ? '' : String(p.src ?? '')} placeholder={String(p.src ?? '').startsWith('data:') ? 'Uploaded or placeholder image' : 'https://...'} onChange={(e) => setProp('src', e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" component="label">Upload image<input hidden type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (f) setProp('src', await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) }))
            }} /></Button>
            <Button size="small" onClick={() => setProp('src', PLACEHOLDER_IMG)}>Placeholder</Button>
          </Box>
          <TextField size="small" label="Alt text" value={String(p.alt ?? '')} onChange={(e) => setProp('alt', e.target.value)} />
          <Sel label="Fit" value={String(p.fit ?? 'cover')} options={['cover', 'contain', 'fill', 'none']} onChange={(v) => setProp('fit', v)} />
        </Section>
      )}
      {node.type === 'input' && (
        <Section title="Text field">
          <TextField size="small" label="Label" value={String(p.label ?? '')} onChange={(e) => setProp('label', e.target.value)} />
          <TextField size="small" label="Placeholder" value={String(p.placeholder ?? '')} onChange={(e) => setProp('placeholder', e.target.value)} />
          <TextField size="small" label="Helper text" value={String(p.helper ?? '')} onChange={(e) => setProp('helper', e.target.value)} />
          <Sel label="Variant" value={String(p.variant ?? 'outlined')} options={['outlined', 'filled', 'standard']} onChange={(v) => setProp('variant', v)} />
          <Sel label="Size" value={String(p.size ?? 'medium')} options={['small', 'medium']} onChange={(v) => setProp('size', v)} />
          <Sel label="Type" value={String(p.type ?? 'text')} options={['text', 'email', 'password', 'number', 'search', 'tel', 'url']} onChange={(v) => setProp('type', v)} />
        </Section>
      )}
      {(node.type === 'checkbox' || node.type === 'switch') && (
        <Section title={node.type === 'checkbox' ? 'Checkbox' : 'Switch'}>
          <TextField size="small" label="Label" value={String(p.label ?? '')} onChange={(e) => setProp('label', e.target.value)} />
          <FormControlLabel label="Checked by default" control={<Switch size="small" checked={!!p.checked} onChange={(e) => setProp('checked', e.target.checked)} />} />
          <SwatchSelect label="Colour" allowNone={false} value={String(p.color ?? 'primary')} options={brand} onChange={(v) => setProp('color', v)} />
        </Section>
      )}
      {node.type === 'chip' && (
        <Section title="Chip">
          <TextField size="small" label="Label" value={String(p.label ?? '')} onChange={(e) => setProp('label', e.target.value)} />
          <Sel label="Variant" value={String(p.variant ?? 'filled')} options={['filled', 'outlined']} onChange={(v) => setProp('variant', v)} />
          <SwatchSelect label="Colour (none = default)" value={p.color && p.color !== 'default' ? String(p.color) : ''} options={brand} onChange={(v) => setProp('color', v || 'default')} />
          <Sel label="Size" value={String(p.size ?? 'medium')} options={['small', 'medium']} onChange={(v) => setProp('size', v)} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setPicking(true)}>{p.icon ? `Icon: ${iconLabel(String(p.icon))}` : 'Add icon'}</Button>
            {p.icon && <Button size="small" onClick={() => setProp('icon', undefined)}>Remove</Button>}
          </Box>
        </Section>
      )}
      {node.type === 'avatar' && (
        <Section title="Avatar">
          <TextField size="small" label="Initials" value={String(p.text ?? '')} onChange={(e) => setProp('text', e.target.value)} />
          <RemField label="Size" allowEmpty={false} value={Number(p.size ?? 5000)} onChange={(v) => v !== undefined && setProp('size', v)} />
          <TextField size="small" label="Image URL (optional)" value={String(p.src ?? '').startsWith('data:') ? '' : String(p.src ?? '')} placeholder={String(p.src ?? '').startsWith('data:') ? 'Uploaded image' : 'https://...'} onChange={(e) => setProp('src', e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" component="label">Upload image<input hidden type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (f) setProp('src', await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) }))
            }} /></Button>
            {p.src && <Button size="small" onClick={() => setProp('src', undefined)}>Remove image</Button>}
          </Box>
        </Section>
      )}
      {node.type === 'link' && (
        <Section title="Link">
          <TextField size="small" label="Text" value={String(p.text ?? '')} onChange={(e) => setProp('text', e.target.value)} />
          <TextField size="small" label="URL" value={String(p.href ?? '')} onChange={(e) => setProp('href', e.target.value)} />
          <Sel label="Text style (from theme)" value={String(p.variant ?? 'body1')} options={theme.text.map((t) => ({ value: t.id, label: t.name }))} onChange={(v) => setProp('variant', v)} />
          <Sel label="Underline" value={String(p.underline ?? 'hover')} options={['hover', 'always', 'none']} onChange={(v) => setProp('underline', v)} />
        </Section>
      )}
      {item && (item.root.type === 'text' || item.root.type === 'button') && (
        <Section title="Instance text">
          <TextField size="small" label="Override text" value={String(p.text ?? '')} placeholder={String(item.root.props?.text ?? '')} onChange={(e) => setProp('text', e.target.value)} />
        </Section>
      )}

      <Section title="Size">
        <Typography variant="caption" color="text.secondary">Width</Typography>
        <SizingField label="Width" value={eff.width} onChange={(v) => set('width', v)} />{reset('width')}
        <Typography variant="caption" color="text.secondary">Height</Typography>
        <SizingField label="Height" value={eff.height} onChange={(v) => set('height', v)} />{reset('height')}
      </Section>

      {(node.type === 'text' || isContainer) && (
        <Section title={node.type === 'text' ? 'Text alignment' : 'Text alignment (children)'}>
          <ToggleButtonGroup size="small" exclusive value={eff.textAlign ?? ''} onChange={(_, v) => set('textAlign', v || undefined)}>
            <ToggleButton value="left" aria-label="align left"><FormatAlignLeft fontSize="small" /></ToggleButton>
            <ToggleButton value="center" aria-label="align center"><FormatAlignCenter fontSize="small" /></ToggleButton>
            <ToggleButton value="right" aria-label="align right"><FormatAlignRight fontSize="small" /></ToggleButton>
            <ToggleButton value="justify" aria-label="justify"><FormatAlignJustify fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          {reset('textAlign')}
          {node.type === 'text' && (eff.width?.mode ?? 'hug') !== 'fill' && eff.width?.mode !== 'fixed' && <Typography variant="caption" color="text.secondary">Set width to Fill or Fixed to see alignment.</Typography>}
        </Section>
      )}

      <Section title="Alignment in parent">
        <Sel label="Align self in parent" value={eff.selfAlign ?? 'auto'} options={['auto', 'start', 'center', 'end', 'stretch']} onChange={(v) => set('selfAlign', v)} />{reset('selfAlign')}
      </Section>

      {isContainer && (
        <>
          <Section title="Auto layout">
            <Sel label="Direction" value={eff.direction ?? 'column'} options={['column', 'row']} onChange={(v) => set('direction', v)} />{reset('direction')}
            <FormControlLabel label="Wrap" control={<Switch size="small" checked={!!eff.wrap} onChange={(e) => set('wrap', e.target.checked)} />} />{reset('wrap')}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <AlignMatrix x={eff.alignX ?? 'start'} y={eff.alignY ?? 'start'} onChange={(x, y) => { set('alignX', x); set('alignY', y) }} />
              <Typography variant="caption" color="text.secondary">Alignment of children</Typography>
            </Box>
            {reset('alignX')}
            {(() => {
              const row = (eff.direction ?? 'column') === 'row'
              const gx = eff.gapX ?? eff.gap
              const gy = eff.gapY ?? eff.gap
              const autoNote = row ? 'Auto on horizontal spreads items across the row. Auto on vertical spreads wrapped lines apart (give the container a height).' : 'Auto on vertical spreads items down the column. Auto on horizontal spreads wrapped columns apart (give the container a height).'
              return (
                <>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <RemField label="Horizontal gap" width="11rem" tokens={spaceTokens} value={typeof gx === 'number' ? gx : undefined} placeholder={gx === 'auto' ? 'auto' : '0'} onChange={(v) => set('gapX', v ?? 0)} />
                    <FormControlLabel label="Auto" control={<Switch size="small" checked={gx === 'auto'} onChange={(e) => set('gapX', e.target.checked ? 'auto' : 0)} />} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <RemField label="Vertical gap" width="11rem" tokens={spaceTokens} value={typeof gy === 'number' ? gy : undefined} placeholder={gy === 'auto' ? 'auto' : '0'} onChange={(v) => set('gapY', v ?? 0)} />
                    <FormControlLabel label="Auto" control={<Switch size="small" checked={gy === 'auto'} onChange={(e) => set('gapY', e.target.checked ? 'auto' : 0)} />} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Horizontal gap is the space between items side by side. Vertical gap is the space between lines when items wrap, or between stacked items. {autoNote}</Typography>
                </>
              )
            })()}
            {reset('gapX')}{reset('gapY')}{reset('gap')}
            <FormControlLabel label="Clip content" control={<Switch size="small" checked={!!eff.clip} onChange={(e) => set('clip', e.target.checked)} />} />{reset('clip')}
          </Section>
          <Section title="Padding">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <RemField key={side} label={side} allowEmpty={false} tokens={spaceTokens} value={pad[side]} onChange={(v) => v !== undefined && set('padding', { ...pad, [side]: v })} />
              ))}
            </Box>
            {reset('padding')}
          </Section>
        </>
      )}

      <Section title="Style (theme tokens)">
        {node.type === 'icon'
          ? <SwatchSelect label="Colour" value={node.style?.color ?? ''} options={colourSw} onChange={(v) => setStyle('color', v)} />
          : <SwatchSelect label="Fill (surface colours)" value={node.style?.fill ?? ''} options={surfaceSw} onChange={(v) => setStyle('fill', v)} />}
        {(node.type === 'text' || node.type === 'container' || node.type === 'instance') && <SwatchSelect label="Text colour" value={node.style?.color ?? ''} options={colourSw} onChange={(v) => setStyle('color', v)} />}
        <Sel label="Radius" value={node.style?.radius ?? ''} options={['', ...theme.radius.map((r) => ({ value: r.id, label: r.name }))]} onChange={(v) => setStyle('radius', v)} />
        <Sel label="Shadow" value={node.style?.shadow ?? ''} options={['', ...theme.shadows.map((r) => ({ value: r.id, label: r.name }))]} onChange={(v) => setStyle('shadow', v)} />
        <RemField label="Border width" value={node.style?.borderWidth} placeholder="0.0625" onChange={(v) => setStyle('borderWidth', v)} />
        {!!node.style?.borderWidth && <SwatchSelect label="Border colour" allowNone={false} value={node.style?.borderColor ?? 'divider'} options={anySw} onChange={(v) => setStyle('borderColor', v)} />}
      </Section>

      {saving && <SaveAs node={node} onClose={() => setSaving(false)} />}
      <IconPicker open={picking} onClose={() => setPicking(false)} onPick={(f) => setProp('icon', f)} />
    </Box>
  )
}
