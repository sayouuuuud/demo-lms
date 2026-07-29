import {
  Code2, Palette, Megaphone, Languages, BarChart3, Briefcase, Layers,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Code2, Palette, Megaphone, Languages, BarChart3, Briefcase, Layers,
}

export function iconFromName(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Layers
}

export const iconNames = Object.keys(ICONS)
