const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch monorepo root for shared packages
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

const semverPath = (() => {
  try {
    return path.dirname(
      require.resolve("semver/package.json", {
        paths: [projectRoot, monorepoRoot],
      })
    );
  } catch (e) {
    return path.resolve(monorepoRoot, "node_modules/semver");
  }
})();

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  semver: semverPath,
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
