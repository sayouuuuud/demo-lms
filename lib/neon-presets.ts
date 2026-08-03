// ── Dark-mode neon accent presets ───────────────────────────────────────────
// These drive the glowing accent colors that only appear in dark mode: the
// numbers, math symbols, ambient glows, and hover states across the landing
// page. Each preset defines a primary ("teal") and secondary ("violet") accent,
// each with a bright "glow" tone and a slightly darker "deep" tone.
//
// The values map onto the CSS custom properties declared in globals.css:
//   --color-teal-glow / --color-teal-deep      (primary neon accent)
//   --color-violet-glow / --color-violet-deep  (secondary neon accent)
//
// Kept as a plain module (no server imports) so it can be used from client
// components and serialized into the layout's inline theme script.

export const neonPresets = [
  {
    id: 'teal-violet',
    label: 'تيل و بنفسجي',
    tealGlow: 'oklch(0.84 0.13 184)',
    tealDeep: 'oklch(0.72 0.13 187)',
    violetGlow: 'oklch(0.66 0.2 292)',
    violetDeep: 'oklch(0.57 0.21 293)',
    swatch1: '#2dd4bf',
    swatch2: '#8b5cf6',
  },
  {
    // زمرد أكاديمي مع ذهب مطفأ؛ دافئ وواضح من غير نيون فاقع
    id: 'emerald-gold',
    label: 'زمرد و ذهب',
    tealGlow: 'oklch(0.78 0.12 160)',
    tealDeep: 'oklch(0.65 0.12 162)',
    violetGlow: 'oklch(0.78 0.11 84)',
    violetDeep: 'oklch(0.66 0.11 78)',
    swatch1: '#36b887',
    swatch2: '#d6a94b',
  },
  {
    // فيروز هادئ مع نحاس دافئ يناسب الورق والرسوم الخطّية
    id: 'turquoise-copper',
    label: 'فيروز و نحاس',
    tealGlow: 'oklch(0.78 0.11 190)',
    tealDeep: 'oklch(0.65 0.11 192)',
    violetGlow: 'oklch(0.74 0.1 55)',
    violetDeep: 'oklch(0.62 0.105 50)',
    swatch1: '#3ab0a6',
    swatch2: '#c5824b',
  },
  {
    // نيلي تعليمي عميق مع كهرمان مستوحى من إضاءة المخطوطات
    id: 'indigo-amber',
    label: 'نيلي و كهرمان',
    tealGlow: 'oklch(0.72 0.12 270)',
    tealDeep: 'oklch(0.6 0.12 270)',
    violetGlow: 'oklch(0.79 0.12 72)',
    violetDeep: 'oklch(0.67 0.125 67)',
    swatch1: '#6566c5',
    swatch2: '#dda23d',
  },
  {
    // ياقوت مضبوط مع زعفران؛ حيوي لكن أقل تشبعاً من الأحمر/الذهبي السابق
    id: 'ruby-saffron',
    label: 'ياقوت و زعفران',
    tealGlow: 'oklch(0.7 0.13 24)',
    tealDeep: 'oklch(0.59 0.13 24)',
    violetGlow: 'oklch(0.79 0.12 78)',
    violetDeep: 'oklch(0.67 0.12 72)',
    swatch1: '#b85151',
    swatch2: '#d7a23e',
  },
] as const

export type NeonPresetId = (typeof neonPresets)[number]['id']

export const DEFAULT_NEON_PRESET: NeonPresetId = 'teal-violet'

/**
 * Apply a neon preset by writing its four CSS custom properties onto <html>.
 * The values are only *referenced* by `dark:` utilities, so setting them in any
 * mode is harmless — they simply take effect once dark mode is active.
 * Safe to call on the client only (touches document / localStorage).
 */
export function applyNeonPreset(id: NeonPresetId | string) {
  const preset = neonPresets.find((p) => p.id === id)
  if (!preset) return
  const root = document.documentElement
  root.style.setProperty('--color-teal-glow', preset.tealGlow)
  root.style.setProperty('--color-teal-deep', preset.tealDeep)
  root.style.setProperty('--color-violet-glow', preset.violetGlow)
  root.style.setProperty('--color-violet-deep', preset.violetDeep)

  try {
    localStorage.setItem('neon-preset', id)
  } catch {}
}
