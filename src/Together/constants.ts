export const DPR = window.devicePixelRatio ?? 1
export const TOOLS = ['ink', 'highlighter', 'eraser'] as const
export const SIZES = [5, 10, 20, 40]
export const COLORS = [
  '#1a1c2c',
  '#5d275d',
  '#b13e53',
  '#f29cbd',
  '#ef7d57',
  '#ffcd75',
  '#38b764',
  '#257179',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#73eff7',
  '#f4f4f4',
  '#94b0c2',
  '#566c86',
  '#333c57',
] as const

export const SIN = Math.sin
export const PI = Math.PI
export const PI2 = PI * 2
export const PEN_EASING = (t: number) => t * 0.65 + SIN((t * PI) / 2) * 0.35
