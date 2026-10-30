import type { Ticks } from './rem'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
/** Pixel sizes appear only here (device frames). Multiples of 8. */
export const DEVICE_PX: Record<Breakpoint, number> = { mobile: 360, tablet: 768, desktop: 1280 }
/** Min-width where each breakpoint starts, in rem (px / 16). */
export const BREAKPOINT_REM: Record<Breakpoint, number> = { mobile: 0, tablet: 48, desktop: 80 }
export const BREAKPOINTS: Breakpoint[] = ['mobile', 'tablet', 'desktop']

export type Sizing = { mode: 'auto' } | { mode: 'hug' } | { mode: 'fill' } | { mode: 'fixed'; value: Ticks }
export type Align3 = 'start' | 'center' | 'end'

/** Auto-layout properties (Figma-style, no free positioning). */
export interface LayoutProps {
  direction?: 'row' | 'column'
  wrap?: boolean
  /** Legacy single gap; used when gapX / gapY are not set. */
  gap?: Ticks | 'auto'
  /** Space between items in a row (column-gap). 'auto' = space-between when direction is row. */
  gapX?: Ticks | 'auto'
  /** Space between wrapped lines / items in a column (row-gap). 'auto' = space-between when direction is column. */
  gapY?: Ticks | 'auto'
  padding?: { top: Ticks; right: Ticks; bottom: Ticks; left: Ticks }
  alignX?: Align3
  alignY?: Align3
  width?: Sizing
  height?: Sizing
  clip?: boolean
  /** Text alignment (inherited by children). */
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  /** Alignment of this node inside its parent container. */
  selfAlign?: Align3 | 'stretch' | 'auto'
}
export type LayoutKey = keyof LayoutProps

export type Kind = 'element' | 'component' | 'object' | 'layout'
export const KINDS: Kind[] = ['element', 'component', 'object', 'layout']
export const KIND_RANK: Record<Kind, number> = { element: 0, component: 1, object: 2, layout: 3 }
export type Tier = 'out-of-box' | 'designer'

/** Token references only, never raw values. Colours are palette paths like "primary.main". */
export interface NodeStyle {
  fill?: string
  color?: string
  radius?: string
  shadow?: string
  borderWidth?: Ticks
  borderColor?: string
}

export interface DesignNode {
  id: string
  name?: string
  type: 'container' | 'text' | 'button' | 'icon' | 'image' | 'input' | 'checkbox' | 'switch' | 'chip' | 'avatar' | 'link' | 'instance'
  /** For instances: id of the designer library item it references. */
  ref?: string
  /** Mobile-first: base applies everywhere, overrides apply from that breakpoint up. */
  layout: { base: LayoutProps } & Partial<Record<Exclude<Breakpoint, 'mobile'>, LayoutProps>>
  props?: Record<string, string | number | boolean>
  style?: NodeStyle
  children?: DesignNode[]
}

export interface LibraryItem {
  id: string
  name: string
  kind: Kind
  tier: Tier
  derivedFrom?: string
  /** Out-of-box items: ids of the lower-level items this one is assembled from. */
  parts?: string[]
  root: DesignNode
}
