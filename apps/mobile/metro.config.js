// Learn more: https://docs.expo.dev/guides/monorepos/ (SDK 56 auto-configures monorepo resolution).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// libsodium-wrappers(-sumo) is WASM-based and can't run under Hermes. Route it to the native
// JSI module (react-native-libsodium), which mirrors the same API — so @workspace/core's crypto
// runs unchanged on device.
const LIBSODIUM_ALIASES = new Set(['libsodium-wrappers-sumo', 'libsodium-wrappers']);
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if (LIBSODIUM_ALIASES.has(moduleName)) {
    return resolve(context, 'react-native-libsodium', platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
