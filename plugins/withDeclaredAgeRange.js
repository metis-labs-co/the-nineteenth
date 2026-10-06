const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Adds the Declared Age Range entitlement to the iOS app.
 *
 * Required by expo-age-range on iOS 26+; harmless on earlier versions, where the
 * native module short-circuits behind `#available(iOS 26.0, *)`.
 *
 * NOTE: this repo commits `ios/` and never runs `expo prebuild` (doing so would
 * destroy the hand-maintained watchOS targets). The entitlement is therefore
 * also written directly into ios/TheNineteenth/TheNineteenth.entitlements. This
 * plugin exists so the entitlement survives if prebuild is ever run.
 */
module.exports = function withDeclaredAgeRange(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.declared-age-range'] = true;
    return cfg;
  });
};
