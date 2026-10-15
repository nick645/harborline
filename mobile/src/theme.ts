// The web build's palette, as values (React Native has no CSS variables).

import { useColorScheme } from 'react-native'

const light = {
  bg: '#f4f1ea',
  surface: '#ffffff',
  surface2: '#ece7dc',
  text: '#1d2430',
  muted: '#6b7280',
  border: '#d9d2c3',
  accent: '#1f6fb2',
  accentText: '#ffffff',
  good: '#2f8f57',
  bad: '#c0392b',
  warn: '#b7791f',
  sea: '#cfe3f0',
  route: '#7aa3c2',
  port: '#f4f1ea',
  portStroke: '#1d2430',
  home: '#1f6fb2',
  calm: '#4f8fbf',
  choppy: '#3b9c8f',
  rough: '#d07a1e',
  storm: '#b3263a',
  rare: '#2f7fd1',
  legendary: '#c9861a',
  mythic: '#8b3fc6',
}

export type Theme = typeof light

const dark: Theme = {
  bg: '#11161d',
  surface: '#19212b',
  surface2: '#222c38',
  text: '#e6e9ee',
  muted: '#94a0b1',
  border: '#2e3a48',
  accent: '#4b9be0',
  accentText: '#0b1520',
  good: '#4cc27f',
  bad: '#ef6b5b',
  warn: '#e0a84a',
  sea: '#12324a',
  route: '#3d6a8c',
  port: '#e6e9ee',
  portStroke: '#0b1520',
  home: '#4b9be0',
  calm: '#3d7aa6',
  choppy: '#2f8a7e',
  rough: '#c46f16',
  storm: '#c4344a',
  rare: '#5aa2ea',
  legendary: '#e6a53a',
  mythic: '#b07be6',
}

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light
}
