import * as fs from "fs";
import * as path from "path";

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"));

export const ModelVersionPrefix = packageJson.name + "@" + packageJson.version;
