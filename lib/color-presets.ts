export const colorPresets = [
  {
    id: 'navy',
    label: 'كحلي',
    light: { primary: 'oklch(0.27 0.066 264)', sidebar: 'oklch(0.3 0.066 264)', ring: 'oklch(0.3 0.066 264)' },
    dark: { primary: 'oklch(0.45 0.08 264)', sidebar: 'oklch(0.45 0.08 264)', ring: 'oklch(0.45 0.08 264)' },
    swatch: '#1e2a4a',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    light: { primary: 'oklch(0.55 0.21 287)', sidebar: 'oklch(0.6 0.21 287)', ring: 'oklch(0.55 0.21 287)' },
    dark: { primary: 'oklch(0.62 0.21 287)', sidebar: 'oklch(0.62 0.21 287)', ring: 'oklch(0.62 0.21 287)' },
    swatch: '#7c3aed',
  },
  {
    id: 'blue',
    label: 'أزرق',
    light: { primary: 'oklch(0.55 0.2 240)', sidebar: 'oklch(0.6 0.2 240)', ring: 'oklch(0.55 0.2 240)' },
    dark: { primary: 'oklch(0.62 0.2 240)', sidebar: 'oklch(0.62 0.2 240)', ring: 'oklch(0.62 0.2 240)' },
    swatch: '#2563eb',
  },
  {
    id: 'cyan',
    label: 'سماوي',
    light: { primary: 'oklch(0.58 0.18 210)', sidebar: 'oklch(0.62 0.18 210)', ring: 'oklch(0.58 0.18 210)' },
    dark: { primary: 'oklch(0.65 0.18 210)', sidebar: 'oklch(0.65 0.18 210)', ring: 'oklch(0.65 0.18 210)' },
    swatch: '#0891b2',
  },
  {
    id: 'green',
    label: 'أخضر',
    light: { primary: 'oklch(0.55 0.18 160)', sidebar: 'oklch(0.6 0.18 160)', ring: 'oklch(0.55 0.18 160)' },
    dark: { primary: 'oklch(0.62 0.18 160)', sidebar: 'oklch(0.62 0.18 160)', ring: 'oklch(0.62 0.18 160)' },
    swatch: '#16a34a',
  },
  {
    id: 'orange',
    label: 'برتقالي',
    light: { primary: 'oklch(0.65 0.2 55)', sidebar: 'oklch(0.68 0.2 55)', ring: 'oklch(0.65 0.2 55)' },
    dark: { primary: 'oklch(0.7 0.2 55)', sidebar: 'oklch(0.7 0.2 55)', ring: 'oklch(0.7 0.2 55)' },
    swatch: '#ea580c',
  },
  {
    id: 'rose',
    label: 'وردي',
    light: { primary: 'oklch(0.58 0.22 10)', sidebar: 'oklch(0.62 0.22 10)', ring: 'oklch(0.58 0.22 10)' },
    dark: { primary: 'oklch(0.65 0.22 10)', sidebar: 'oklch(0.65 0.22 10)', ring: 'oklch(0.65 0.22 10)' },
    swatch: '#e11d48',
  },
] as const

export type PresetId = (typeof colorPresets)[number]['id']

export function applyColorPreset(id: PresetId | string) {
  const preset = colorPresets.find((p) => p.id === id)
  if (!preset) return
  const isDark = document.documentElement.classList.contains('dark')
  const vals = isDark ? preset.dark : preset.light
  const root = document.documentElement
  root.style.setProperty('--primary', vals.primary)
  root.style.setProperty('--ring', vals.ring)
  root.style.setProperty('--sidebar-primary', vals.sidebar)
  root.style.setProperty('--sidebar-accent', vals.sidebar)
  root.style.setProperty('--sidebar-ring', vals.ring)
  
  try {
    localStorage.setItem('color-preset', id)
  } catch {}
}
