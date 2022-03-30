/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");

const stringify = require("json-stringify-pretty-compact");

const PACKAGES_DIR = path.join(__dirname, "../packages");

const libName = process.argv[2];
if (!libName) {
	console.log("Library name must be present");
	process.exit(1);
}
if (fs.existsSync(path.join(PACKAGES_DIR, libName))) {
	console.log("Library already exists");
	process.exit(1);
}

console.log(`Create package ${libName}`);

fs.mkdirSync(path.join(PACKAGES_DIR, libName));
fs.mkdirSync(path.join(PACKAGES_DIR, libName, "src"));
fs.writeFileSync(path.join(PACKAGES_DIR, libName, ".npmrc"), "package-lock=false");
fs.writeFileSync(path.join(PACKAGES_DIR, libName, "src", "index.ts"), "export default {};");
fs.writeFileSync(
	path.join(PACKAGES_DIR, libName, "src", ".npmignore"),
	`src/
lib/**/*.map
tsconfig.json
.build-cache
`
);
fs.writeFileSync(
	path.join(PACKAGES_DIR, libName, "package.json"),
	stringify({
		name: "@chlorophytum/" + libName,
		version: "0.0.1",
		description: "",
		main: "lib/index.js",
		typings: "lib/index.d.ts",
		scripts: {
			clean: "rimraf lib .build-cache",
			build: "tsc --build",
			test: "ava --verbose"
		},
		author: "Renzhi Li (aka. Belleve Invis)",
		license: "MIT",
		dependencies: {
			tslib: "^2.0.1"
		},
		devDependencies: {
			ava: "^4.1.0"
		},
		publishConfig: {
			access: "public"
		}
	})
);

console.log(
	`Finish creating @chlorophytum/${libName}. Please run 'npm run rebuild' to install dependencies.`
);
