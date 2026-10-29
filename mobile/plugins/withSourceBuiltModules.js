// Expo ships some of its native modules precompiled, and Xcode refuses Swift modules built by an
// older compiler. Every Xcode update would then break the build, so build them from source:
// the Podfile reads this property and turns precompiled modules off.
const { withPodfileProperties } = require('expo/config-plugins')

module.exports = function withSourceBuiltModules(config) {
  return withPodfileProperties(config, (config) => {
    config.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false'
    return config
  })
}
