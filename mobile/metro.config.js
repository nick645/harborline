// The game's rules (../src/game) and small pure helpers (../src/format.ts, ../src/colors.ts)
// are shared with the web build, so Metro needs to watch (and transform) ../src too.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../src')]

module.exports = config
