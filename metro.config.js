const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const mobileRoot = path.resolve(projectRoot, "apps/mobile");

const config = getDefaultConfig(projectRoot);

// Watch monorepo packages
config.watchFolders = [
  mobileRoot,
  path.resolve(projectRoot, "packages/types"),
  path.resolve(projectRoot, "packages/typescript-config"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(mobileRoot, "node_modules"),
];

// Map path aliases to apps/mobile/src
config.resolver.extraNodeModules = {
  "@": path.resolve(mobileRoot, "src"),
  "@/assets": path.resolve(mobileRoot, "assets"),
  "@medirem/types": path.resolve(projectRoot, "packages/types/src"),
};

module.exports = withNativeWind(config, {
  input: "./apps/mobile/src/global.css",
  configPath: "./apps/mobile/tailwind.config.js",
});
