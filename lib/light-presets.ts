// ── Light-mode accent presets ──────────────────────────────────────────────
// These drive the primary brand colors that appear in light mode on the landing page.
// The values map onto the CSS custom properties declared in globals.css:
//   --color-navy / --color-navy-deep / --color-navy-soft
//   --color-emerald-brand / --color-emerald-deep
//   --color-gold / --color-gold-deep

export const lightPresets = [
  {
    id: 'navy-gold',
    label: 'كحلي و ذهبي',
    navy: 'oklch(0.27 0.066 264)',
    navyDeep: 'oklch(0.2 0.055 264)',
    navySoft: 'oklch(0.42 0.07 264)',
    gold: 'oklch(0.77 0.125 84)',
    goldDeep: 'oklch(0.66 0.13 76)',
    emeraldBrand: 'oklch(0.56 0.12 159)',
    emeraldDeep: 'oklch(0.46 0.115 160)',
    swatch1: '#1e2a4a',
    swatch2: '#fbbf24',
  },
  {
    // حِبر أزرق عميق مع ذهبي زعفراني دافئ — قريب من مخطوطات الحبر العربي
    id: 'ink-saffron',
    label: 'حِبر و زعفران',
    navy: 'oklch(0.28 0.07 250)',
    navyDeep: 'oklch(0.21 0.06 250)',
    navySoft: 'oklch(0.43 0.08 250)',
    gold: 'oklch(0.78 0.13 72)',
    goldDeep: 'oklch(0.67 0.135 66)',
    emeraldBrand: 'oklch(0.55 0.11 168)',
    emeraldDeep: 'oklch(0.45 0.11 168)',
    swatch1: '#22315e',
    swatch2: '#e0a53a',
  },
  {
    // أخضر أكاديمي على ورق معتّق مع ذهبي مطفأ — إحساس الكتب القديمة
    id: 'emerald-parchment',
    label: 'زمرد و ورق معتّق',
    navy: 'oklch(0.31 0.075 158)',
    navyDeep: 'oklch(0.23 0.065 158)',
    navySoft: 'oklch(0.46 0.085 158)',
    gold: 'oklch(0.79 0.1 86)',
    goldDeep: 'oklch(0.69 0.11 80)',
    emeraldBrand: 'oklch(0.55 0.13 162)',
    emeraldDeep: 'oklch(0.45 0.125 162)',
    swatch1: '#1c4636',
    swatch2: '#d9b25f',
  },
  {
    // عنابي داكن مع نحاسي/رقّي دافئ — طابع المخطوطات الفاخرة
    id: 'maroon-copper',
    label: 'عنابي و مخطوطات',
    navy: 'oklch(0.3 0.09 28)',
    navyDeep: 'oklch(0.22 0.08 28)',
    navySoft: 'oklch(0.44 0.1 28)',
    gold: 'oklch(0.77 0.11 58)',
    goldDeep: 'oklch(0.66 0.12 52)',
    emeraldBrand: 'oklch(0.55 0.1 40)',
    emeraldDeep: 'oklch(0.46 0.1 40)',
    swatch1: '#4a1f22',
    swatch2: '#d18a4e',
  },
  {
    // نيلي عربي هادئ مع نحاسي وأخضر زيتوني مساعد
    id: 'indigo-copper',
    label: 'نيلي و نحاس',
    navy: 'oklch(0.29 0.075 268)',
    navyDeep: 'oklch(0.21 0.065 268)',
    navySoft: 'oklch(0.44 0.085 268)',
    gold: 'oklch(0.76 0.1 62)',
    goldDeep: 'oklch(0.65 0.11 56)',
    emeraldBrand: 'oklch(0.56 0.1 140)',
    emeraldDeep: 'oklch(0.46 0.1 140)',
    swatch1: '#2b2c66',
    swatch2: '#c98d52',
  },
] as const

export type LightPresetId = (typeof lightPresets)[number]['id']

export const DEFAULT_LIGHT_PRESET: LightPresetId = 'navy-gold'

/**
 * Apply a light preset by writing its CSS custom properties onto <html>.
 * Safe to call on the client only.
 */
export function applyLightPreset(id: LightPresetId | string) {
  const preset = lightPresets.find((p) => p.id === id)
  if (!preset) return
  const root = document.documentElement
  root.style.setProperty('--color-navy', preset.navy)
  root.style.setProperty('--color-navy-deep', preset.navyDeep)
  root.style.setProperty('--color-navy-soft', preset.navySoft)
  root.style.setProperty('--color-gold', preset.gold)
  root.style.setProperty('--color-gold-deep', preset.goldDeep)
  root.style.setProperty('--color-emerald-brand', preset.emeraldBrand)
  root.style.setProperty('--color-emerald-deep', preset.emeraldDeep)

  try {
    localStorage.setItem('light-preset', id)
  } catch {}
}
