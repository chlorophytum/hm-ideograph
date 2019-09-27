const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

const REPOSITORY_DIR = path.join(__dirname, "..");
const LINKS_JSON = path.resolve(REPOSITORY_DIR, ".links.json");

if (fs.existsSync(LINKS_JSON)) {
	const { clear, links } = JSON.parse(fs.readFileSync(LINKS_JSON));
	if (clear) {
		for (const package of clear) {
			const packagePath = path.resolve(REPOSITORY_DIR, "node_modules", package);
			rimraf.sync(packagePath);
			fs.mkdirSync(packagePath);
		}
	}
	for (const package in links) {
		const packagePath = path.resolve(REPOSITORY_DIR, "node_modules", package);
		rimraf.sync(packagePath);

		const dst = path.resolve(REPOSITORY_DIR, links[package]);
		console.log(`Link ${package} -> ${dst}`);
		fs.symlinkSync(dst, packagePath, "junction"); // Use junction to avoid elevation
	}
}
