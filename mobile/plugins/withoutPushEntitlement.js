// Storm alerts are local notifications scheduled on the phone, so the app never needs remote
// push. expo-notifications always adds the push entitlement, which a personal (free) Apple
// team can't sign; this takes it back out.
const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment']
    return config
  })
}
