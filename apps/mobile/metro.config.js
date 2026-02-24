const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// mira el workspace completo (packages + node_modules root)
config.watchFolders = [workspaceRoot];

// resuelve módulos desde mobile y desde el root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// ayuda con symlinks/hoisting
config.resolver.disableHierarchicalLookup = true;

module.exports = config;