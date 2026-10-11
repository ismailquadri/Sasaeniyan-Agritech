// Crop catalog — single source of truth for crop presentation across all apps.
export interface Crop {
  id: string
  name: string
  nameHa: string
  unit: 'basket' | 'bag' | 'sack'
  unitLabel: string
  photo: string
  fallback: string
}

export const CROPS: Crop[] = [
  { id: 'tomato', name: 'Tomato', nameHa: 'Tumatir', unit: 'basket', unitLabel: '50kg basket', photo: '/crops/tomato.jpg', fallback: '#c2410c' },
  { id: 'pepper', name: 'Pepper', nameHa: 'Barkono', unit: 'basket', unitLabel: '40kg basket', photo: '/crops/pepper.jpg', fallback: '#dc2626' },
  { id: 'onion', name: 'Onion', nameHa: 'Albasa', unit: 'basket', unitLabel: '50kg basket', photo: '/crops/onion.jpg', fallback: '#7c3aed' },
  { id: 'cabbage', name: 'Cabbage', nameHa: 'Kabeji', unit: 'basket', unitLabel: '45kg basket', photo: '/crops/cabbage.jpg', fallback: '#16a34a' },
  { id: 'watermelon', name: 'Watermelon', nameHa: 'Kankana', unit: 'basket', unitLabel: '60kg basket', photo: '/crops/watermelon.jpg', fallback: '#15803d' },
  { id: 'cucumber', name: 'Cucumber', nameHa: 'Kokwamba', unit: 'basket', unitLabel: '40kg basket', photo: '/crops/cucumber.jpg', fallback: '#4d7c0f' },
  { id: 'maize', name: 'Maize', nameHa: 'Masara', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/maize.jpg', fallback: '#ca8a04' },
  { id: 'rice', name: 'Rice (paddy)', nameHa: 'Shinkafa', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/rice.jpg', fallback: '#a16207' },
  { id: 'sorghum', name: 'Sorghum', nameHa: 'Dawa', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/sorghum.jpg', fallback: '#92400e' },
  { id: 'millet', name: 'Millet', nameHa: 'Gero', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/millet.jpg', fallback: '#b45309' },
  { id: 'groundnut', name: 'Groundnut', nameHa: 'Gyada', unit: 'sack', unitLabel: '80kg sack', photo: '/crops/groundnut.jpg', fallback: '#9a3412' },
  { id: 'ginger', name: 'Ginger', nameHa: 'Citta', unit: 'sack', unitLabel: '60kg sack', photo: '/crops/ginger.jpg', fallback: '#a8540f' },
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Catalog lookup with a safe fallback for unknown crop ids. */
export function cropById(id: string): Crop {
  return (
    CROPS.find((c) => c.id === id) ?? {
      id,
      name: cap(id),
      nameHa: cap(id),
      unit: 'basket',
      unitLabel: 'basket',
      photo: `/crops/${id}.jpg`,
      fallback: '#6b7280',
    }
  )
}
