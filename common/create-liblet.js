const fs = require("fs");
const path = require("path");
const stringify = require("json-stringify-pretty-compact");

const LIBLET_DIR = path.join(__dirname, "../liblet");

const libName = process.argv[2];
if (!libName) {
	console.log("Library name must be present");
	process.exit(1);
}
if (fs.existsSync(path.join(LIBLET_DIR, libName))) {
	console.log("Library already exists");
	process.exit(1);
}

console.log(`Create liblet ${libName}`);

fs.mkdirSync(path.join(LIBLET_DIR, libName));
fs.mkdirSync(path.join(LIBLET_DIR, libName, "src"));
fs.writeFileSync(path.join(LIBLET_DIR, libName, ".npmrc"), "package-lock=false");
fs.writeFileSync(path.join(LIBLET_DIR, libName, "src", "index.ts"), "export default {};");
fs.writeFileSync(
	path.join(LIBLET_DIR, libName, "src", "dummy.test.ts"),
	`import test from "ava";

test("Dummy test :: ${libName}", t => {
	t.is(1, 1);
});
`
);
fs.writeFileSync(
	path.join(LIBLET_DIR, libName, "src", ".npmignore"),
	`src/
lib/**/*.map
tsconfig.json
.build-cache
`
);
fs.writeFileSync(
	path.join(LIBLET_DIR, libName, "package.json"),
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
			tslib: "^1.9.3"
		},
		devDependencies: {
			ava: "^1.4.1"
		},
		ava: {
			files: ["lib/**/*.test.js"]
		},
		publishConfig: {
			access: "public"
		}
	})
);

console.log(
	`Finish creating @chlorophytum/${libName}. Please run 'npm run rebuild' to install dependencies.`
);
