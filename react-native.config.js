/**
 * React Native autolinking overrides.
 *
 * react-native-watch-connectivity is an iOS-only library (Apple Watch <-> phone
 * via WatchConnectivity). Its Android target ships only the unmodified
 * create-react-native-library template stub (a `multiply` method), which fails
 * to compile against RN 0.81's codegen-generated abstract base class:
 *
 *   WatchConnectivityModule.kt: Class 'WatchConnectivityModule' is not abstract
 *   and does not implement abstract base class members; 'multiply' overrides nothing.
 *
 * Android never loads it at runtime anyway — src/watch/transport.ts uses the
 * Wear OS transport on Android and only require()s this package inside an
 * iOS-only branch. Exclude it from Android autolinking so it isn't compiled.
 */
module.exports = {
  dependencies: {
    'react-native-watch-connectivity': {
      platforms: {
        android: null,
      },
    },
  },
};
