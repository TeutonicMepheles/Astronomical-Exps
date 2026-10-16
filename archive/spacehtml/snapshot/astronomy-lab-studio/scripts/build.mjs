import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "site");
const output = path.join(root, "dist");

if (!output.startsWith(`${root}${path.sep}`)) {
  throw new Error("Refusing to build outside the project directory.");
}

await fs.rm(output, { recursive: true, force: true });
await fs.cp(source, output, { recursive: true });

const required = [
  "index.html",
  "labs/newtonian-telescope/index.html",
  "labs/rocket-launch/index.html",
  "assets/index-D1qZtLxy.css",
  "assets/telescope-lab-nzssYpXX.js",
  "assets/rocket-lab-BO623EKo.js"
];

for (const relativePath of required) {
  await fs.access(path.join(output, relativePath));
}

console.log(`Static site built at ${output}`);
