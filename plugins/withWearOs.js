/**
 * withWearOs — Expo config plugin that injects the Wear OS companion module into
 * the generated `android/` on every prebuild (android/ is gitignored, so the
 * module can't live there permanently). The source of truth is the committed
 * top-level `wear/` directory.
 *
 * On prebuild it:
 *   1. copies `wear/` → `android/wear/`
 *   2. adds `include ':wear'` to android/settings.gradle
 *   3. adds the Kotlin Compose-compiler plugin to the root buildscript classpath
 *      (Kotlin 2.0 requires it; the RN app doesn't pull it in)
 *
 * All steps are idempotent. Embedded Play delivery (wearApp project(':wear')) is
 * intentionally NOT wired here — it needs matching signing and is a later,
 * release-focused concern; for dev the wear APK is installed via adb.
 */
const { withDangerousMod, withSettingsGradle, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Must match the kotlinVersion resolved by expo-root-project (see the generated
// android build). Keep in sync on Expo SDK upgrades.
const KOTLIN_VERSION = '2.0.21';
const COMPOSE_CLASSPATH = `classpath('org.jetbrains.kotlin:compose-compiler-gradle-plugin:${KOTLIN_VERSION}')`;

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(from, to);
    else fs.copyFileSync(from, to);
  }
}

const withWearModuleSource = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'wear');
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'wear');
      if (!fs.existsSync(src)) {
        throw new Error(`[withWearOs] expected Wear source at ${src}`);
      }
      fs.rmSync(dest, { recursive: true, force: true });
      copyDirSync(src, dest);
      return cfg;
    },
  ]);

const withWearSettingsInclude = (config) =>
  withSettingsGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes("include ':wear'")) {
      cfg.modResults.contents += "\ninclude ':wear'\n";
    }
    return cfg;
  });

const withComposeCompilerClasspath = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('compose-compiler-gradle-plugin')) {
      // Insert into the first buildscript dependencies block.
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/,
        `$1\n    ${COMPOSE_CLASSPATH}`,
      );
    }
    return cfg;
  });

module.exports = (config) =>
  withComposeCompilerClasspath(withWearSettingsInclude(withWearModuleSource(config)));
