// iOS 27 won't launch an app that hasn't adopted the scene life cycle, and the Expo SDK 57
// template still starts React Native from the app delegate. Expo ships a scene delegate
// (EXExpoAppSceneDelegate) for this; point the scene manifest at it and let it own the window.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins')

const START_IN_APP_DELEGATE = /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif\s*/

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    }
    return config
  })

  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents
    if (src.includes('ExpoReactNativeFactoryProvider')) return config
    if (!START_IN_APP_DELEGATE.test(src)) {
      throw new Error('withSceneLifecycle: AppDelegate.swift no longer matches the expected template')
    }
    src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
    // The scene delegate creates the window and starts React Native into it.
    src = src.replace(START_IN_APP_DELEGATE, '')
    config.modResults.contents = src
    return config
  })
}
