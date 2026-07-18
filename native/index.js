// @keyspot/native — load native addon or throw.
// Consumers should use isNativeAvailable() to detect presence.
try {
  module.exports = require('./dist/keyspot-native.node');
} catch (err) {
  module.exports = {
    // Resolver: package installed but native build failed
    isNativeAvailable: () => false,
    _loadError: err instanceof Error ? err.message : String(err),
  };
}
