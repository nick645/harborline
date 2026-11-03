// The soundtrack and sounds (made by scripts/audio.ts). One music bed follows the time and the
// weather, one ambience bed follows the place, and effects mark what happens. Beds crossfade;
// everything pauses when the app leaves the foreground. The phone's silent switch mutes it all,
// and other apps' audio keeps playing underneath.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { AppState } from 'react-native'

export type Mood = 'day' | 'night' | 'storm'
export type Bed = 'harbour' | 'night' | 'storm' | 'tavern'
export type Sfx = 'tap' | 'confirm' | 'error' | 'coins' | 'buy' | 'depart' | 'bell' | 'find' | 'signed' | 'rankup' | 'thunder' | 'sink'

const MUSIC: Record<Mood, number> = {
  day: require('../../assets/audio/music-day.wav'),
  night: require('../../assets/audio/music-night.wav'),
  storm: require('../../assets/audio/music-storm.wav'),
}
const BEDS: Record<Bed, number> = {
  harbour: require('../../assets/audio/amb-harbour.wav'),
  night: require('../../assets/audio/amb-night.wav'),
  storm: require('../../assets/audio/amb-storm.wav'),
  tavern: require('../../assets/audio/amb-tavern.wav'),
}
const SFX: Record<Sfx, number> = {
  tap: require('../../assets/audio/sfx-tap.wav'),
  confirm: require('../../assets/audio/sfx-confirm.wav'),
  error: require('../../assets/audio/sfx-error.wav'),
  coins: require('../../assets/audio/sfx-coins.wav'),
  buy: require('../../assets/audio/sfx-buy.wav'),
  depart: require('../../assets/audio/sfx-depart.wav'),
  bell: require('../../assets/audio/sfx-bell.wav'),
  find: require('../../assets/audio/sfx-find.wav'),
  signed: require('../../assets/audio/sfx-signed.wav'),
  rankup: require('../../assets/audio/sfx-rankup.wav'),
  thunder: require('../../assets/audio/sfx-thunder.wav'),
  sink: require('../../assets/audio/sfx-sink.wav'),
}

// Mix levels (0..1). Music sits under the sea; taps are barely there.
const MUSIC_LEVEL: Record<Mood, number> = { day: 0.32, night: 0.36, storm: 0.34 }
const BED_LEVEL: Record<Bed, number> = { harbour: 0.5, night: 0.45, storm: 0.45, tavern: 0.4 }
const SFX_LEVEL: Record<Sfx, number> = {
  tap: 0.25,
  confirm: 0.45,
  error: 0.5,
  coins: 0.45,
  buy: 0.55,
  depart: 0.45,
  bell: 0.5,
  find: 0.55,
  signed: 0.55,
  rankup: 0.6,
  thunder: 0.6,
  sink: 0.7,
}
const FADE_MS = 2500
const STEP_MS = 50

export type SoundPrefs = { music: boolean; effects: boolean }
const PREF_KEY = 'harborline.sound'

let prefs: SoundPrefs = { music: true, effects: true }
let mood: Mood = 'day'
let bed: Bed = 'harbour'
let taverns = 0
let active = AppState.currentState === 'active'
let started = false
const listeners = new Set<() => void>()

const music = new Map<Mood, AudioPlayer>()
const beds = new Map<Bed, AudioPlayer>()
const effects = new Map<Sfx, AudioPlayer>()
const lastPlayed = new Map<Sfx, number>()
/** Where each bed is heading: the fade loop walks volumes toward these. */
const targets = new Map<AudioPlayer, number>()
let fader: ReturnType<typeof setInterval> | null = null
let thunderTimer: ReturnType<typeof setTimeout> | null = null

function loop(src: number): AudioPlayer {
  const p = createAudioPlayer(src)
  p.loop = true
  p.volume = 0
  return p
}

function fade() {
  if (fader) return
  fader = setInterval(() => {
    let moving = false
    const step = STEP_MS / FADE_MS
    for (const [p, to] of targets) {
      const v = p.volume
      if (Math.abs(v - to) < 0.001) {
        if (to === 0 && p.playing) p.pause()
        continue
      }
      moving = true
      if (to > 0 && !p.playing) p.play()
      p.volume = v < to ? Math.min(to, v + step) : Math.max(to, v - step)
    }
    if (!moving && fader) {
      clearInterval(fader)
      fader = null
    }
  }, STEP_MS)
}

/** Point every bed at where it should be now. */
function mix() {
  if (!started) return
  const place: Bed = taverns > 0 ? 'tavern' : mood === 'storm' ? 'storm' : mood === 'night' ? 'night' : 'harbour'
  bed = place
  for (const m of Object.keys(MUSIC) as Mood[]) {
    const want = active && prefs.music && m === mood ? MUSIC_LEVEL[m] : 0
    if (want > 0 && !music.has(m)) music.set(m, loop(MUSIC[m]))
    const p = music.get(m)
    if (p) targets.set(p, want)
  }
  for (const b of Object.keys(BEDS) as Bed[]) {
    const want = active && prefs.effects && b === bed ? BED_LEVEL[b] : 0
    if (want > 0 && !beds.has(b)) beds.set(b, loop(BEDS[b]))
    const p = beds.get(b)
    if (p) targets.set(p, want)
  }
  if (!active) {
    // Leaving: stop at once rather than fade into the background.
    for (const [p, to] of targets) if (to === 0 && p.playing) p.pause()
  }
  fade()
  rollThunder()
}

/** Thunder now and then while a storm is out. */
function rollThunder() {
  const want = started && active && prefs.effects && mood === 'storm'
  if (!want) {
    if (thunderTimer) clearTimeout(thunderTimer)
    thunderTimer = null
    return
  }
  if (thunderTimer) return
  thunderTimer = setTimeout(
    () => {
      thunderTimer = null
      play('thunder', 0.4 + Math.random() * 0.4)
      rollThunder()
    },
    14_000 + Math.random() * 26_000,
  )
}

/** Set up the audio session and load the switches. Safe to call more than once. */
export async function startSound() {
  if (started) return
  started = true
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false })
    const saved = await AsyncStorage.getItem(PREF_KEY)
    if (saved) prefs = { ...prefs, ...(JSON.parse(saved) as Partial<SoundPrefs>) }
  } catch {
    // Sound is a nicety: without a session or saved switches, carry on with the defaults.
  }
  AppState.addEventListener('change', (s) => {
    active = s === 'active'
    mix()
  })
  listeners.forEach((f) => f())
  mix()
}

export function setMood(next: Mood) {
  if (next === mood) return
  mood = next
  mix()
}

/** A tavern is on screen (returns the undo). Its room noise wins over the sea. */
export function enterTavern(): () => void {
  taverns++
  mix()
  return () => {
    taverns--
    mix()
  }
}

export function play(name: Sfx, gain = 1) {
  if (!started || !active || !prefs.effects) return
  const t = Date.now()
  if (t - (lastPlayed.get(name) ?? 0) < 120) return
  lastPlayed.set(name, t)
  let p = effects.get(name)
  if (!p) {
    p = createAudioPlayer(SFX[name])
    effects.set(name, p)
  }
  p.volume = SFX_LEVEL[name] * gain
  void p.seekTo(0).then(() => p.play())
}

export const getPrefs = () => prefs

export function setPrefs(next: Partial<SoundPrefs>) {
  prefs = { ...prefs, ...next }
  void AsyncStorage.setItem(PREF_KEY, JSON.stringify(prefs)).catch(() => undefined)
  listeners.forEach((f) => f())
  mix()
}

export function onPrefs(f: () => void): () => void {
  listeners.add(f)
  return () => listeners.delete(f)
}

// Actions report themselves, so the change they make sounds like a choice, not like the sea.
let actedAt = 0
export const markAct = () => (actedAt = Date.now())
export const justActed = () => Date.now() - actedAt < 600
