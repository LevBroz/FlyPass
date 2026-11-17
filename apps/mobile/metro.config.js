// Expo detecta el monorepo automáticamente (watchFolders/nodeModulesPaths).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
