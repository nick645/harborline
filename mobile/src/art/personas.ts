// How each Legend and Mythic looks (who they are lives in src/game/data/personas.ts). A persona
// keeps the captain's own face, skin and age, and replaces everything they wear, carry and
// trail behind them. Legends glow amber; each Mythic has a colour of its own and goes stranger.

import type { Look } from './looks'

type PersonaLook = Partial<Look>

const LEGEND = '#f2b45a'

export const PERSONA_LOOKS: Record<string, PersonaLook> = {
  // ---------- Legends ----------
  lamplighter: {
    hat: 'lamphat', hatColor: '#231b26', coat: '#2b2433', coatStyle: 'robe', scarf: '#f2b45a',
    prop: 'lantern', trousers: '#1d1218', boots: '#1d1218', fx: ['embers'], aura: LEGEND,
  },
  'gull-monarch': {
    hat: 'crown', hatColor: '#d8cfc2', coat: '#6f7a86', coatStyle: 'cape', capeColor: '#ece6dc', scarf: '#9ec0cf',
    prop: 'none', companion: 'gull', fx: ['feathers'], aura: LEGEND,
  },
  admiral: {
    hat: 'bicorne', hatColor: '#1a2238', coat: '#1f2f4a', coatStyle: 'greatcoat', scarf: '#f3e7d8',
    prop: 'spyglass', trousers: '#efe6d6', boots: '#1d1218', fx: ['medals', 'monocle'], aura: LEGEND,
  },
  harpooner: {
    hat: 'hood', hatColor: '#6e4a33', coat: '#5a3f2c', coatStyle: 'fur', scarf: '#c9b6ae',
    prop: 'harpoon', boots: '#3a2a1e', fx: ['tooth'], aura: LEGEND,
  },
  cartographer: {
    hat: 'brim', hatColor: '#2f4a3a', coat: '#3d5a73', coatStyle: 'robe', scarf: '#e8d9a0',
    prop: 'scroll', glasses: true, fx: ['glints'], aura: LEGEND,
  },
  keeper: {
    hat: 'beacon', hatColor: '#b8423a', coat: '#b8423a', coatStyle: 'stripes', scarf: '#f3e7d8',
    prop: 'none', fx: ['beam'], aura: LEGEND,
  },
  diver: {
    hat: 'helmet', hatColor: '#c9a24a', coat: '#7a6448', coatStyle: 'oilskin', scarf: '#c9a24a',
    prop: 'none', boots: '#c9a24a', trousers: '#7a6448', fx: ['bubbles'], aura: LEGEND,
  },
  stormbeard: {
    hat: 'bare', coat: '#2e3a4a', coatStyle: 'oilskin', scarf: '#9ec0cf', facialHair: 'beard', hair: '#2e1c19',
    prop: 'none', fx: ['beads', 'lightning'], aura: LEGEND,
  },
  'tide-singer': {
    hat: 'kelp', hatColor: '#3f6a3a', coat: '#2f6a6a', coatStyle: 'robe', scarf: '#7fd1a8', hairStyle: 'long',
    prop: 'conch', fx: ['rings'], aura: LEGEND,
  },
  'salt-saint': {
    hat: 'crown', hatColor: '#f3efe8', coat: '#e8e2d6', coatStyle: 'robe', scarf: '#c9d6dc',
    prop: 'none', fx: ['halo', 'glints'], aura: '#fff3dc',
  },
  smuggler: {
    hat: 'plumed', hatColor: '#2a1a2e', coat: '#4a2346', coatStyle: 'cape', capeColor: '#6a2a5e', scarf: '#f2c75a',
    prop: 'coin', extra: 'earring', fx: ['glints'], aura: LEGEND,
  },
  'brass-arm': {
    hat: 'cap', hatColor: '#3a3026', coat: '#5a4a3a', coatStyle: 'peacoat', scarf: '#c2452a',
    prop: 'none', fx: ['brass-arm', 'goggles'], aura: LEGEND,
  },
  frostbound: {
    hat: 'hood', hatColor: '#e8eef2', coat: '#c9d6e2', coatStyle: 'fur', scarf: '#9ec0cf', hair: '#e8eef2',
    prop: 'none', fx: ['frost'], aura: '#cfe6f2',
  },
  'fisher-king': {
    hat: 'straw', hatColor: '#e2c27a', coat: '#6b8f4e', coatStyle: 'knit', scarf: '#f2b45a',
    prop: 'line', companion: 'cat', aura: LEGEND,
  },
  bellringer: {
    hat: 'souwester', hatColor: '#e9b23c', coat: '#e9b23c', coatStyle: 'oilskin', scarf: '#2f5d62',
    prop: 'bell', fx: ['rings'], aura: LEGEND,
  },
  'old-oak': {
    hat: 'bare', coat: '#5a4030', coatStyle: 'fur', scarf: '#6b8f4e', facialHair: 'beard', hair: '#5f7040', age: 2,
    prop: 'none', fx: ['moss'], aura: LEGEND,
  },
  'scarlet-sail': {
    hat: 'tricorn', hatColor: '#1d1218', coat: '#2b1f2c', coatStyle: 'cape', capeColor: '#c0242c', scarf: '#f3e7d8',
    prop: 'spyglass', aura: LEGEND,
  },
  'night-heron': {
    hat: 'plumed', hatColor: '#1d2230', coat: '#23262f', coatStyle: 'greatcoat', scarf: '#c9d6dc',
    prop: 'none', companion: 'heron', fx: ['feathers'], aura: LEGEND,
  },
  rainmaker: {
    hat: 'brim', hatColor: '#3d5a73', coat: '#46566e', coatStyle: 'raincoat', scarf: '#f2b45a',
    prop: 'umbrella', fx: ['cloud'], aura: LEGEND,
  },
  ropewalker: {
    hat: 'bandana', hatColor: '#c2452a', coat: '#2f5d62', coatStyle: 'stripes', scarf: '#f2b45a',
    prop: 'rope', aura: LEGEND,
  },

  // ---------- Mythics ----------
  drowned: {
    hat: 'tricorn', hatColor: '#24403a', coat: '#2f5a52', coatStyle: 'greatcoat', scarf: '#7fd1a8', skin: '#9fb8a8',
    hairStyle: 'long', hair: '#3a5a4a', prop: 'none', fx: ['ghost', 'bubbles', 'flow-hair'], aura: '#7fd1c8',
  },
  stormcaller: {
    hat: 'hood', hatColor: '#2a2040', coat: '#2a2040', coatStyle: 'cape', capeColor: '#4a2a6a', scarf: '#e070ff',
    prop: 'none', fx: ['float', 'lightning', 'cloud'], aura: '#c04aff',
  },
  'lantern-head': {
    hat: 'none', coat: '#1a1420', coatStyle: 'robe', scarf: '#ffd27a', prop: 'none', boots: '#1a1420',
    fx: ['lantern-head', 'embers', 'float'], aura: '#ffd27a',
  },
  'kraken-bound': {
    hat: 'tricorn', hatColor: '#3a1420', coat: '#6a1f2e', coatStyle: 'greatcoat', scarf: '#c98a9e',
    prop: 'none', companion: 'octopus', fx: ['tentacles'], aura: '#d0506e',
  },
  'night-woven': {
    hat: 'hood', hatColor: '#141a3a', coat: '#141a3a', coatStyle: 'robe', scarf: '#9ec0ff',
    prop: 'none', fx: ['twinkles', 'float'], aura: '#7a8aff',
  },
  'coral-crown': {
    hat: 'coral', hatColor: '#e0607a', coat: '#1f6a6a', coatStyle: 'robe', scarf: '#ff9a7a', hairStyle: 'long',
    prop: 'conch', fx: ['fish'], aura: '#ff8aa0',
  },
  'living-tide': {
    hat: 'bare', hatColor: '#d8f2f8', coat: '#2f7fa8', coatStyle: 'robe', scarf: '#bfe8f2', skin: '#8fc8d8', hair: '#d8f2f8', hairStyle: 'long',
    prop: 'none', fx: ['water', 'ghost', 'flow-hair', 'bubbles'], aura: '#5fd0f0',
  },
  'moon-warden': {
    hat: 'crown', hatColor: '#d8dde6', coat: '#9aa4b4', coatStyle: 'robe', scarf: '#f3efe8',
    prop: 'none', fx: ['moon', 'glints'], aura: '#e8ecf6',
  },
  whalesinger: {
    hat: 'hood', hatColor: '#1f3a5a', coat: '#1f3a5a', coatStyle: 'fur', scarf: '#9ec0cf',
    prop: 'none', fx: ['whale', 'rings'], aura: '#6fa8e0',
  },
  'sea-fire': {
    hat: 'tricorn', hatColor: '#12101a', coat: '#1a1626', coatStyle: 'greatcoat', scarf: '#6fe0ff',
    prop: 'none', fx: ['bluefire'], aura: '#4ad0ff',
  },
}
