import { rem } from './rem'
import type { DesignNode, LayoutProps, LibraryItem, Kind } from './types'
import { KIND_RANK } from './types'

/** Neutral placeholder (inline SVG) used until a designer sets an image. */
export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#e0e3e7"/><path d="M200 280l70-90 50 60 40-50 80 80z" fill="#b8bfc7"/><circle cx="250" cy="140" r="26" fill="#b8bfc7"/></svg>',
  )

let seq = 0
const nid = () => `n${++seq}`
const p = (v: number) => ({ top: rem(v), right: rem(v), bottom: rem(v), left: rem(v) })
const px = (x: number, y: number) => ({ top: rem(y), right: rem(x), bottom: rem(y), left: rem(x) })
const FILL = { mode: 'fill' } as const

type Patch = {
  name?: string; props?: DesignNode['props']; style?: DesignNode['style']; children?: DesignNode[]
  layout?: LayoutProps; tablet?: LayoutProps; desktop?: LayoutProps
  /** Applies to tablet and desktop alike (they are siblings that each follow mobile). */
  up?: LayoutProps
}
type Use = (partId: string, patch?: Patch) => DesignNode

const reid = (n: DesignNode) => { n.id = nid(); n.children?.forEach(reid) }

/** Registry of out-of-box items, in dependency order: a composite can only use items registered before it. */
const OOB: LibraryItem[] = []

function register(kind: Kind, id: string, name: string, build: (use: Use) => DesignNode) {
  const parts = new Set<string>()
  const use: Use = (partId, patch = {}) => {
    const src = OOB.find((i) => i.id === `oob:${partId}`)
    if (!src) throw new Error(`unknown library part ${partId}`)
    parts.add(src.id)
    const c = structuredClone(src.root)
    reid(c)
    return {
      ...c,
      name: patch.name ?? c.name,
      props: { ...c.props, ...patch.props },
      style: { ...c.style, ...patch.style },
      layout: {
        base: { ...c.layout.base, ...patch.layout },
        ...(c.layout.tablet || patch.tablet || patch.up ? { tablet: { ...c.layout.tablet, ...patch.up, ...patch.tablet } } : {}),
        ...(c.layout.desktop || patch.desktop || patch.up ? { desktop: { ...c.layout.desktop, ...patch.up, ...patch.desktop } } : {}),
      },
      children: patch.children ?? c.children,
    }
  }
  const root = build(use)
  reid(root)
  OOB.push({ id: `oob:${id}`, name, kind, tier: 'out-of-box', parts: [...parts], root })
}
const N = (type: DesignNode['type'], props: DesignNode['props'], layout: LayoutProps = {}, style?: DesignNode['style']): DesignNode =>
  ({ id: nid(), type, props, layout: { base: layout }, style })

// ───────────────────────── ELEMENTS: single building blocks ─────────────────────────
register('element', 'container', 'Container', () => ({ ...N('container', undefined, { direction: 'column', gap: rem(1), padding: p(1) }) }))
register('element', 'row', 'Row', () => N('container', undefined, { direction: 'row', gap: rem(1), alignY: 'center', padding: p(1) }))
register('element', 'text', 'Text', () => N('text', { text: 'Text', variant: 'body1' }, { width: FILL }))
register('element', 'button', 'Button', () => N('button', { text: 'Button', buttonStyle: 'primary', size: 'medium' }))
register('element', 'icon', 'Icon', () => N('icon', { icon: 'Home', size: rem(1.5) }))
register('element', 'divider', 'Divider', () => N('container', undefined, { width: FILL, height: { mode: 'fixed', value: rem(0.0625) } }, { fill: 'divider' }))
register('element', 'image', 'Image', () => N('image', { src: PLACEHOLDER_IMG, alt: 'Image', fit: 'cover' }, { width: FILL, height: { mode: 'fixed', value: rem(12) } }, { radius: 'control' }))
register('element', 'input', 'Text field', () => N('input', { label: 'Label', placeholder: '', helper: '', variant: 'outlined', size: 'medium', type: 'text' }, { width: FILL }))
register('element', 'checkbox', 'Checkbox', () => N('checkbox', { label: 'Checkbox', checked: false, color: 'primary' }))
register('element', 'switch', 'Switch', () => N('switch', { label: 'Switch', checked: false, color: 'primary' }))
register('element', 'chip', 'Chip', () => N('chip', { label: 'Chip', variant: 'filled', color: 'default', size: 'medium' }))
register('element', 'avatar', 'Avatar', () => N('avatar', { text: 'AB', size: rem(2.5) }))
register('element', 'link', 'Link', () => N('link', { text: 'Link', href: '#', variant: 'body1', underline: 'hover' }))

// ───────────────────────── COMPONENTS: elements combined ─────────────────────────
register('component', 'card', 'Card', (use) =>
  use('container', { style: { fill: 'background.paper', radius: 'card', shadow: 'sm' }, layout: { padding: p(1.5) }, children: [
    use('text', { props: { text: 'Card title', variant: 'h6' } }),
    use('text', { props: { text: 'Supporting text that describes the card in a sentence or two.', variant: 'body2' } }),
  ] }))
register('component', 'form-field', 'Form field', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0.5), width: FILL }, children: [
    use('text', { props: { text: 'Email address', variant: 'subtitle2' } }),
    use('input', { props: { label: '', placeholder: 'name@example.com' } }),
    use('text', { props: { text: 'We never share your email.', variant: 'caption' }, style: { color: 'text.secondary' } }),
  ] }))
register('component', 'search-bar', 'Search bar', (use) =>
  use('row', { layout: { padding: p(0), gap: rem(1), width: FILL }, children: [
    use('icon', { props: { icon: 'Search' } }),
    use('input', { props: { label: 'Search', size: 'small' } }),
    use('button', { props: { text: 'Go' } }),
  ] }))
register('component', 'avatar-name', 'Avatar with name', (use) =>
  use('row', { layout: { padding: p(0), gap: rem(1) }, children: [
    use('avatar', { props: { text: 'JD' } }),
    use('container', { layout: { padding: p(0), gap: rem(0) }, children: [
      use('text', { props: { text: 'Jordan Doe', variant: 'subtitle2' }, layout: { width: { mode: 'hug' } } }),
      use('text', { props: { text: 'Product designer', variant: 'caption' }, style: { color: 'text.secondary' }, layout: { width: { mode: 'hug' } } }),
    ] }),
  ] }))
register('component', 'alert', 'Alert banner', (use) =>
  use('row', { style: { fill: 'background.paper', radius: 'control', borderWidth: rem(0.0625), borderColor: 'info.main' }, layout: { padding: p(1.5), gap: rem(1), width: FILL }, children: [
    use('icon', { props: { icon: 'InfoOutlined' }, style: { color: 'info.main' } }),
    use('text', { props: { text: 'Heads up: this is an informational message.', variant: 'body2' } }),
  ] }))
register('component', 'stat', 'Stat', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0.25) }, children: [
    use('text', { props: { text: 'Active users', variant: 'caption' }, style: { color: 'text.secondary' }, layout: { width: { mode: 'hug' } } }),
    use('text', { props: { text: '12,480', variant: 'h4' }, layout: { width: { mode: 'hug' } } }),
  ] }))
register('component', 'list-item', 'List item', (use) =>
  use('row', { layout: { padding: px(1, 0.75), gap: rem(1.5), width: FILL }, children: [
    use('icon', { props: { icon: 'FolderOutlined' } }),
    use('container', { layout: { padding: p(0), gap: rem(0), width: FILL }, children: [
      use('text', { props: { text: 'Item title', variant: 'subtitle1' } }),
      use('text', { props: { text: 'Secondary description', variant: 'body2' }, style: { color: 'text.secondary' } }),
    ] }),
    use('icon', { props: { icon: 'ChevronRight' } }),
  ] }))
register('component', 'button-group', 'Button group', (use) =>
  use('row', { layout: { padding: p(0), gap: rem(1) }, children: [
    use('button', { props: { text: 'Primary action' } }),
    use('button', { props: { text: 'Secondary', buttonStyle: 'outline' } }),
  ] }))
register('component', 'tag-list', 'Tag list', (use) =>
  use('row', { layout: { padding: p(0), gap: rem(0.5), wrap: true, width: FILL }, children: [
    use('chip', { props: { label: 'Design' } }), use('chip', { props: { label: 'Research', variant: 'outlined' } }), use('chip', { props: { label: 'Prototype', color: 'primary' } }),
  ] }))
register('component', 'toggle-row', 'Toggle row', (use) =>
  use('row', { layout: { padding: p(0), gap: 'auto', width: FILL }, children: [
    use('text', { props: { text: 'Email notifications', variant: 'body1' }, layout: { width: { mode: 'hug' } } }),
    use('switch', { props: { label: '', checked: true } }),
  ] }))
register('component', 'breadcrumb', 'Breadcrumb', (use) =>
  use('row', { layout: { padding: p(0), gap: rem(0.5), wrap: true }, children: [
    use('link', { props: { text: 'Home', variant: 'body2' } }), use('icon', { props: { icon: 'ChevronRight', size: rem(1) } }),
    use('link', { props: { text: 'Section', variant: 'body2' } }), use('icon', { props: { icon: 'ChevronRight', size: rem(1) } }),
    use('text', { props: { text: 'Current page', variant: 'body2' }, layout: { width: { mode: 'hug' } } }),
  ] }))
register('component', 'feature-item', 'Feature item', (use) =>
  use('container', { layout: { padding: p(1), gap: rem(1), width: FILL }, children: [
    use('icon', { props: { icon: 'BoltOutlined', size: rem(2) }, style: { color: 'primary.main' } }),
    use('text', { props: { text: 'Fast by default', variant: 'h6' } }),
    use('text', { props: { text: 'A short description of the benefit this feature provides.', variant: 'body2' }, style: { color: 'text.secondary' } }),
  ] }))
register('component', 'link-list', 'Link list', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0.75) }, children: [
    use('text', { props: { text: 'Company', variant: 'subtitle2' }, layout: { width: { mode: 'hug' } } }),
    use('link', { props: { text: 'About', variant: 'body2' } }), use('link', { props: { text: 'Careers', variant: 'body2' } }), use('link', { props: { text: 'Contact', variant: 'body2' } }),
  ] }))

// ───────────────────────── OBJECTS: components combined into sections ─────────────────────────
register('object', 'navbar', 'Navbar', (use) =>
  use('row', { style: { fill: 'background.paper', borderWidth: rem(0.0625), borderColor: 'divider' }, layout: { padding: px(1.5, 1), gap: rem(1), width: FILL, wrap: true, alignY: 'center' },
    children: [
      use('text', { props: { text: 'Brand', variant: 'h6' }, layout: { width: { mode: 'hug' } } }),
      use('search-bar', { layout: { width: FILL } }),
      use('avatar-name'),
    ] }))
register('object', 'hero', 'Hero section', (use) =>
  use('container', { layout: { padding: p(2), gap: rem(2), width: FILL, alignX: 'start' }, up: { direction: 'row', alignY: 'center' }, desktop: { padding: p(4) }, children: [
    use('container', { layout: { padding: p(0), gap: rem(1.5), width: FILL }, children: [
      use('text', { props: { text: 'Design once. Ship everywhere.', variant: 'h3' } }),
      use('text', { props: { text: 'A short supporting sentence that explains the product and why it matters.', variant: 'body1' }, style: { color: 'text.secondary' } }),
      use('button-group'),
    ] }),
    use('image', { layout: { height: { mode: 'fixed', value: rem(16) } } }),
  ] }))
register('object', 'feature-grid', 'Feature grid', (use) =>
  use('container', { layout: { padding: p(2), gap: rem(1), width: FILL }, up: { direction: 'row', wrap: true }, children: [
    use('feature-item', { layout: { width: { mode: 'fixed', value: rem(14) } } }),
    use('feature-item', { layout: { width: { mode: 'fixed', value: rem(14) } } }),
    use('feature-item', { layout: { width: { mode: 'fixed', value: rem(14) } } }),
  ] }))
register('object', 'login-form', 'Login form', (use) =>
  use('container', { style: { fill: 'background.paper', radius: 'card', shadow: 'md' }, layout: { padding: p(2), gap: rem(1.5), width: { mode: 'fixed', value: rem(24) } }, children: [
    use('text', { props: { text: 'Sign in', variant: 'h5' } }),
    use('form-field'),
    use('form-field', { children: [
      use('text', { props: { text: 'Password', variant: 'subtitle2' } }),
      use('input', { props: { label: '', type: 'password', placeholder: 'Your password' } }),
    ] }),
    use('toggle-row'),
    use('button', { props: { text: 'Sign in' }, layout: { width: FILL } }),
    use('breadcrumb', { children: [use('link', { props: { text: 'Forgot your password?', variant: 'body2' } })] }),
  ] }))
register('object', 'product-card', 'Product card', (use) =>
  use('container', { style: { fill: 'background.paper', radius: 'card', shadow: 'sm' }, layout: { padding: p(0), gap: rem(0), width: { mode: 'fixed', value: rem(18) }, clip: true }, children: [
    use('image', { style: { radius: 'none' } }),
    use('container', { layout: { padding: p(1.5), gap: rem(1), width: FILL }, children: [
      use('tag-list'),
      use('text', { props: { text: 'Product name', variant: 'h6' } }),
      use('stat', { children: [
        use('text', { props: { text: 'Price', variant: 'caption' }, layout: { width: { mode: 'hug' } } }),
        use('text', { props: { text: '$48.00', variant: 'h5' }, layout: { width: { mode: 'hug' } } }),
      ] }),
      use('button-group'),
    ] }),
  ] }))
register('object', 'stats-row', 'Stats row', (use) =>
  use('row', { style: { fill: 'background.paper', radius: 'card' }, layout: { padding: p(2), gap: rem(2), wrap: true, width: FILL, alignY: 'start' }, children: [
    use('stat'), use('stat', { children: [use('text', { props: { text: 'Revenue', variant: 'caption' }, layout: { width: { mode: 'hug' } } }), use('text', { props: { text: '$84k', variant: 'h4' }, layout: { width: { mode: 'hug' } } })] }),
    use('stat', { children: [use('text', { props: { text: 'Conversion', variant: 'caption' }, layout: { width: { mode: 'hug' } } }), use('text', { props: { text: '4.6%', variant: 'h4' }, layout: { width: { mode: 'hug' } } })] }),
  ] }))
register('object', 'pricing-card', 'Pricing card', (use) =>
  use('container', { style: { fill: 'background.paper', radius: 'card', shadow: 'md' }, layout: { padding: p(2), gap: rem(1.5), width: { mode: 'fixed', value: rem(18) } }, children: [
    use('tag-list', { children: [use('chip', { props: { label: 'Popular', color: 'primary' } })] }),
    use('text', { props: { text: 'Pro plan', variant: 'h6' } }),
    use('text', { props: { text: '$29 / month', variant: 'h4' } }),
    use('list-item'), use('list-item'),
    use('button', { props: { text: 'Choose plan' }, layout: { width: FILL } }),
  ] }))
register('object', 'testimonial', 'Testimonial', (use) =>
  use('container', { style: { fill: 'background.paper', radius: 'card', borderWidth: rem(0.0625), borderColor: 'divider' }, layout: { padding: p(2), gap: rem(1.5), width: FILL }, children: [
    use('icon', { props: { icon: 'FormatQuote', size: rem(2) }, style: { color: 'primary.main' } }),
    use('text', { props: { text: 'This changed how our team ships design. Everything stays in sync.', variant: 'body1' } }),
    use('avatar-name'),
  ] }))
register('object', 'sidebar', 'Sidebar navigation', (use) =>
  use('container', { style: { fill: 'background.paper', borderWidth: rem(0.0625), borderColor: 'divider' }, layout: { padding: p(1), gap: rem(0.5), width: FILL }, desktop: { width: { mode: 'fixed', value: rem(16) } }, children: [
    use('text', { props: { text: 'Workspace', variant: 'h6' }, layout: { padding: undefined } }),
    use('list-item'), use('list-item'), use('list-item'),
  ] }))
register('object', 'footer', 'Footer', (use) =>
  use('container', { style: { fill: 'background.paper' }, layout: { padding: p(2), gap: rem(1.5), width: FILL }, children: [
    use('row', { layout: { padding: p(0), gap: rem(3), wrap: true, alignY: 'start', width: FILL }, children: [use('link-list'), use('link-list'), use('link-list')] }),
    use('divider'),
    use('text', { props: { text: '© 2025 Brand. All rights reserved.', variant: 'caption' }, style: { color: 'text.secondary' } }),
  ] }))

// ───────────────────────── LAYOUTS: objects arranged into whole pages ─────────────────────────
register('layout', 'landing-page', 'Landing page', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0), width: FILL }, children: [
    use('navbar'), use('hero'), use('feature-grid'),
    use('container', { layout: { padding: p(2), gap: rem(2), width: FILL }, up: { direction: 'row', wrap: true }, children: [use('pricing-card'), use('testimonial', { layout: { width: { mode: 'fixed', value: rem(20) } } })] }),
    use('footer'),
  ] }))
register('layout', 'dashboard', 'Dashboard', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0), width: FILL }, desktop: { direction: 'row', alignY: 'start' }, children: [
    use('sidebar'),
    use('container', { layout: { padding: p(2), gap: rem(2), width: FILL }, children: [
      use('stats-row'),
      use('container', { style: { fill: 'background.paper', radius: 'card' }, layout: { padding: p(1), gap: rem(0), width: FILL }, children: [use('list-item'), use('list-item'), use('list-item')] }),
    ] }),
  ] }))
register('layout', 'login-page', 'Login page', (use) =>
  use('container', { style: { fill: 'background.default' }, layout: { padding: p(2), gap: rem(2), width: FILL, alignX: 'center', alignY: 'center', height: { mode: 'fixed', value: rem(36) } }, children: [use('login-form')] }))
register('layout', 'article-page', 'Article page', (use) =>
  use('container', { layout: { padding: p(0), gap: rem(0), width: FILL }, children: [
    use('navbar'),
    use('container', { layout: { padding: p(2), gap: rem(1.5), width: FILL }, children: [
      use('breadcrumb'),
      use('text', { props: { text: 'A clear headline for the article', variant: 'h3' } }),
      use('avatar-name'),
      use('image', { layout: { height: { mode: 'fixed', value: rem(18) } } }),
      use('text', { props: { text: 'Body copy goes here. Write a few sentences so the layout shows how long-form text flows across the page at every screen size.', variant: 'body1' } }),
      use('testimonial'),
    ] }),
    use('footer'),
  ] }))

export const OUT_OF_BOX: LibraryItem[] = OOB
export const oobById = (id: string) => OUT_OF_BOX.find((i) => i.id === id)

/** Classification rule: element = nothing inside; component = elements; object = at least one component; layout = at least one object. */
export function classifyError(item: LibraryItem): string | null {
  const parts = (item.parts ?? []).map((id) => oobById(id)!)
  if (parts.some((x) => !x)) return `${item.name}: unknown part`
  if (parts.some((x) => KIND_RANK[x.kind] >= KIND_RANK[item.kind])) return `${item.name}: contains an item of the same or a higher level`
  const kinds = new Set(parts.map((x) => x.kind))
  if (item.kind === 'element' && parts.length) return `${item.name}: an element cannot be assembled from other items`
  if (item.kind === 'component' && (!parts.length || [...kinds].some((k) => k !== 'element'))) return `${item.name}: a component is built from elements only`
  if (item.kind === 'object' && !kinds.has('component')) return `${item.name}: an object needs at least one component`
  if (item.kind === 'layout' && !kinds.has('object')) return `${item.name}: a layout needs at least one object`
  return null
}
