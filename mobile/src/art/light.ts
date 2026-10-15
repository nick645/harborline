// Light follows the player's own clock: soft dawn, bright day, golden hour, lamplit night.
// Every palette is warm; storms lay a cold violet over whichever is showing, on purpose.

export type Phase = 'dawn' | 'day' | 'golden' | 'night'

export interface Light {
  label: string
  sky: string
  skyLow: string
  sun: string
  sunX: number
  sunY: number
  stars: number
  land: string
  sea: string
  seaLine: string
  silhouette: string
  hull: string
  cabin: string
  lamp: string
  glint: number
}

export const LIGHT: Record<Phase, Light> = {
  dawn: {
    label: 'Dawn',
    sky: '#f0b9a6', skyLow: '#f8dcb9', sun: '#fff1cf', sunX: 70, sunY: 176, stars: 0,
    land: '#8a6070', sea: '#5a7f9a', seaLine: '#b3d0dc', silhouette: '#4a3346',
    hull: '#4a3346', cabin: '#f3e7d8', lamp: '#ffd27a', glint: 0.35,
  },
  day: {
    label: 'Day',
    sky: '#a7d3e6', skyLow: '#f3e2bf', sun: '#fff7d6', sunX: 270, sunY: 54, stars: 0,
    land: '#8c7458', sea: '#3f8aa6', seaLine: '#b4e2ea', silhouette: '#4a3346',
    hull: '#3d5a73', cabin: '#f3e7d8', lamp: '#ffe2a0', glint: 0.25,
  },
  golden: {
    label: 'Golden hour',
    sky: '#eba06a', skyLow: '#f6cb8f', sun: '#ffe6a6', sunX: 270, sunY: 132, stars: 0,
    land: '#7a4e5e', sea: '#3d6680', seaLine: '#9ec0cf', silhouette: '#3b2a3f',
    hull: '#3b2a3f', cabin: '#5a3c4c', lamp: '#ffd27a', glint: 0.6,
  },
  night: {
    label: 'Lamplit night',
    sky: '#2a1e36', skyLow: '#3a2840', sun: '#f4e6c8', sunX: 270, sunY: 62, stars: 1,
    land: '#20162a', sea: '#241c3a', seaLine: '#4a3a66', silhouette: '#150e1a',
    hull: '#150e1a', cabin: '#2a1e30', lamp: '#ffc46b', glint: 0.55,
  },
}

export const STORM = {
  veil: '#2a2450',
  cloud: '#3b3266',
  cloudLow: '#332a5c',
  bolt: '#ff5c93',
  rain: '#b9c3ec',
}

export function phaseAt(t: number): Phase {
  const h = new Date(t).getHours()
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'golden'
  return 'night'
}

export function lightAt(t: number): Light {
  return LIGHT[phaseAt(t)]
}
