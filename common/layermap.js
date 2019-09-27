const fs = require("fs");
const path = require("path");
const stringify = require("json-stringify-pretty-compact");

const CONFIG_DIR = path.join(__dirname, "../config");
const PACKAGES_DIR = path.join(__dirname, "../packages");

const tsPackages = new Map();
for (const packageItem of fs.readdirSync(PACKAGES_DIR)) {
	const fullPath = path.join(PACKAGES_DIR, packageItem);
	if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, "package.json"))) {
		const packageJson = JSON.parse(fs.readFileSync(path.join(fullPath, "package.json")));
		tsPackages.set(packageItem, packageJson.name);
	}
}

for (const package of tsPackages.keys()) {
	const pkgPath = path.join(PACKAGES_DIR, package);
	const pkgJsonPath = path.join(pkgPath, "package.json");
	const tsconfigJsonPath = path.join(pkgPath, "tsconfig.json");
	const packageJson = JSON.parse(fs.readFileSync(pkgJsonPath));

	const newDeps = [];
	for (const [key, pn] of tsPackages) {
		if (packageJson.dependencies[pn]) {
			newDeps.push({ path: "../" + key });
		}
	}
	const tsconfigJson = {
		extends: "../../config/tsconfig.settings.json",
		references: newDeps,
		compilerOptions: {
			rootDir: "src",
			outDir: "lib",
			tsBuildInfoFile: ".build-cache/src"
		}
	};

	fs.writeFileSync(tsconfigJsonPath, stringify(tsconfigJson, { indent: "\t" }));
	console.log("LayerMap: Update dependency for", package);
}

const rootTsConfigJsonPath = path.join(CONFIG_DIR, "tsconfig.json");
const rootTsConfigJson = {
	files: [],
	references: [...tsPackages.keys()].map(p => ({ path: "../packages/" + p }))
};
fs.writeFileSync(rootTsConfigJsonPath, stringify(rootTsConfigJson, { indent: "\t" }));
console.log("LayerMap: Setup global dependencies");
