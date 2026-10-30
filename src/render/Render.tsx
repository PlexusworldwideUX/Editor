import { createContext, useContext } from 'react'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toCss } from '../model/rem'
import { buttonStyleOf, dropShadowValue, radiusValue, shadowValue, type Theme } from '../model/theme'
import type { DesignNode, LibraryItem } from '../model/types'
import { nodeCss, styleCss } from './css'
import { Icon } from './icons'

interface Ctx { theme: Theme; library: LibraryItem[]; thumb?: boolean; editor?: { selection: string[]; onSelect: (id: string, additive: boolean) => void; editState: string | null } }
export const RenderCtx = createContext<Ctx | null>(null)

type Sx = Record<string, unknown>

export function Render({ node, parent, locked = false, extraSx, textOverride }: {
  node: DesignNode; parent?: DesignNode; locked?: boolean; extraSx?: Sx; textOverride?: string
}) {
  const ctx = useContext(RenderCtx)!
  const { theme, library, editor } = ctx
  const res = { byMode: (l: string, d: string) => (th: { palette: { mode: string } }) => (th.palette.mode === 'dark' ? d : l), radius: (t: string) => radiusValue(theme, t), shadow: (t: string, drop: boolean) => (drop ? dropShadowValue(theme, t) : shadowValue(theme, t)) }

  if (node.type === 'instance') {
    const item = library.find((i) => i.id === node.ref)
    if (!item) return <Box sx={{ border: '0.125rem dashed', borderColor: 'error.main', color: 'error.main', p: 1 }} onClick={(e) => { e.stopPropagation(); editor?.onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey) }}>Missing library item</Box>
    const inst: Sx = nodeCss(node, parent, res)
    const text = typeof node.props?.text === 'string' ? node.props.text : undefined
    const pass: Record<string, string | number | boolean> = {}
    if (typeof node.props?.state === 'string' && node.props.state) pass.state = node.props.state
    if (node.props?.disabled) pass.disabled = true
    return <Render node={{ ...item.root, id: node.id, name: item.name, props: { ...item.root.props, ...pass } }} parent={parent} locked={locked} extraSx={inst} textOverride={text} />
  }

  const selected = !locked && !!editor?.selection.includes(node.id)
  const css = nodeCss(node, parent, res)
  const sx: Sx[] = [css, extraSx ?? {}]
  // while a state is being edited, show that state on the selected node
  const primarySel = editor?.selection[editor.selection.length - 1]
  const forced = !locked && editor?.editState && primarySel === node.id ? node.states?.find((x) => x.id === editor.editState) : undefined
  if (forced) sx.push(styleCss(node, forced.style, { ...node.style, ...forced.style }, res, true))
  const placeholder = node.type === 'container' && !node.children?.length && !node.style?.fill && (editor || ctx.thumb)
  if (placeholder) sx.push({ minHeight: ctx.thumb ? '3rem' : '2rem', minWidth: ctx.thumb ? '8rem' : undefined, backgroundImage: 'repeating-linear-gradient(45deg, rgba(11,87,208,.08) 0 0.5rem, transparent 0.5rem 1rem)' })
  if (editor && !locked) {
    // selection/hover drawn by an overlay so it works on every element type, whatever its own outline/border/shadow
    sx.push({
      cursor: 'pointer', position: 'relative', pointerEvents: 'auto',
      '&::after': { content: '""', position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, boxSizing: 'border-box',
        outline: selected ? '0.125rem solid #0b57d0' : 'none', outlineOffset: '-0.125rem', backgroundColor: selected ? 'rgba(11,87,208,0.08)' : 'transparent' },
      '&:hover::after': { outline: selected ? '0.125rem solid #0b57d0' : '0.0625rem dashed #0b57d0', outlineOffset: '-0.0625rem' },
    })
  }
  const onClick = editor && !locked ? (e: React.MouseEvent) => { e.stopPropagation(); editor.onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey) } : undefined
  const p = node.props ?? {}
  const stateAttr = typeof p.state === 'string' && p.state ? p.state : undefined
  const common = { sx: sx as never, onClick, 'data-node': node.id, 'data-state': stateAttr, 'aria-disabled': p.disabled ? true : undefined }
  const disabledCls = p.disabled || forced?.kind === 'disabled' ? 'Mui-disabled' : undefined
  const kids = (n: DesignNode) => n.children?.map((c) => <Render key={c.id} node={c} parent={n} locked={locked} />)

  switch (node.type) {
    case 'text':
      return <Typography variant={(p.variant as 'h1') ?? 'body1'} {...common}>{textOverride ?? String(p.text ?? '')}</Typography>
    case 'button':
      return (
        <Button variant={buttonStyleOf(theme, p).id as 'contained'} size={(p.size as 'medium') ?? 'medium'}
          startIcon={p.icon ? <Icon name={String(p.icon)} /> : undefined} disableRipple className={disabledCls} {...common}
          onClickCapture={editor && !locked ? (e) => e.preventDefault() : undefined}>
          {textOverride ?? String(p.text ?? '')}
        </Button>
      )
    case 'icon':
      return (
        <Box component="span" {...common} sx={[...sx, { display: 'inline-flex', lineHeight: 0 }] as never}>
          <Icon name={String(p.icon ?? 'Home')} sx={{ fontSize: toCss(Number(p.size ?? 3000)) }} />
        </Box>
      )
    case 'image':
      return (
        <Box {...common} sx={[...sx, { overflow: 'hidden' }] as never}>
          <Box component="img" src={String(p.src ?? '')} alt={String(p.alt ?? '')} draggable={false}
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: String(p.fit ?? 'cover'), pointerEvents: 'none' }} />
        </Box>
      )
    case 'input':
      return (
        <TextField label={String(p.label ?? '') || undefined} placeholder={String(p.placeholder ?? '')} helperText={String(p.helper ?? '') || undefined}
          variant={(p.variant as 'outlined') ?? 'outlined'} size={(p.size as 'small') ?? 'medium'} type={String(p.type ?? 'text')}
          slotProps={{ input: { readOnly: true } }} {...common} />
      )
    case 'checkbox':
      return <FormControlLabel label={String(p.label ?? '')} control={<Checkbox checked={!!p.checked} color={(p.color as 'primary') ?? 'primary'} onChange={() => {}} />} {...common} />
    case 'switch':
      return <FormControlLabel label={String(p.label ?? '')} control={<Switch checked={!!p.checked} color={(p.color as 'primary') ?? 'primary'} onChange={() => {}} />} {...common} />
    case 'chip':
      return (
        <Chip label={String(p.label ?? '')} variant={(p.variant as 'filled') ?? 'filled'} color={(p.color as 'default') ?? 'default'} size={(p.size as 'medium') ?? 'medium'}
          icon={p.icon ? <Icon name={String(p.icon)} /> : undefined} {...common} />
      )
    case 'avatar':
      return (
        <Avatar src={p.src ? String(p.src) : undefined} {...common} sx={[...sx, { width: toCss(Number(p.size ?? 5000)), height: toCss(Number(p.size ?? 5000)) }] as never}>
          {String(p.text ?? '')}
        </Avatar>
      )
    case 'link':
      return (
        <Link href={String(p.href ?? '#')} variant={(p.variant as 'body1') ?? 'body1'} underline={(p.underline as 'hover') ?? 'hover'} {...common}
          onClick={(e: React.MouseEvent) => { e.preventDefault(); onClick?.(e) }}>
          {textOverride ?? String(p.text ?? '')}
        </Link>
      )
    default:
      return <Box {...common}>{kids(node)}</Box>
  }
}
