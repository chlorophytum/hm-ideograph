const fs = require("fs");
const path = require("path");
const stringify = require("json-stringify-pretty-compact");

const LIBLET_DIR = path.join(__dirname, "../liblet");

const tsPackages = new Map();
for (const packageItem of fs.readdirSync(LIBLET_DIR)) {
	const fullPath = path.join(LIBLET_DIR, packageItem);
	if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, "package.json"))) {
		const packageJson = JSON.parse(fs.readFileSync(path.join(fullPath, "package.json")));
		tsPackages.set(packageItem, packageJson.name);
	}
}

for (const package of tsPackages.keys()) {
	const pkgPath = path.join(LIBLET_DIR, package);
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
		extends: "../tsconfig.settings.json",
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

const rootTsConfigJsonPath = path.join(LIBLET_DIR, "tsconfig.json");
const rootTsConfigJson = {
	files: [],
	references: [...tsPackages.keys()].map(p => ({ path: "./" + p }))
};
fs.writeFileSync(rootTsConfigJsonPath, stringify(rootTsConfigJson, { indent: "\t" }));
console.log("LayerMap: Setup global dependencies");
