const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../.."); // chipdog-v2

const config = getDefaultConfig(projectRoot);

// 1) Que Metro observe el workspace entero (para seguir symlinks / paquetes)
config.watchFolders = [workspaceRoot];

// 2) Dile a Metro dónde buscar node_modules (mobile y root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3) Fuerza a resolver módulos desde el root (evita que Metro se pierda)
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => path.join(workspaceRoot, "node_modules", name),
  }
);

module.exports = config;