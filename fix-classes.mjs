import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const EXTS = new Set([".tsx", ".ts", ".css"]);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!EXTS.has(extname(name))) continue;
    const original = readFileSync(full, "utf8");
    const fixed = original.replaceAll("surface-DEFAULT", "surface");
    if (fixed !== original) {
      writeFileSync(full, fixed, "utf8");
      console.log("Fixed:", full);
    }
  }
}

walk("src");
console.log("Done.");
