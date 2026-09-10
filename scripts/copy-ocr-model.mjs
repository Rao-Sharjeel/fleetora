/**
 * Copies the PP-OCR detection and recognition models into a kiosk app's
 * public/ directory.
 *
 * They can't be imported: @gutenye/ocr-models' exports map doesn't expose
 * assets/, so a bundler can't reach it. Copying it into public/ sidesteps that
 * entirely — the app fetches it by a plain URL, and the PWA service worker
 * precaches it like any other static file. The copy is gitignored; this runs
 * from each app's predev/prebuild.
 *
 * Usage: node scripts/copy-ocr-model.mjs <app-dir>
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = process.argv[2];
if (!appDir) {
  console.error("usage: node scripts/copy-ocr-model.mjs <app-dir>");
  process.exit(1);
}

// Detection finds the digits anywhere on the cluster; recognition reads them.
const MODELS = [
  ["ch_PP-OCRv4_det_infer.onnx", "ppocr-det.onnx"],
  ["ch_PP-OCRv4_rec_infer.onnx", "ppocr-rec.onnx"],
];
const targetDir = join(repoRoot, appDir, "public/ocr");

try {
  mkdirSync(targetDir, { recursive: true });
  for (const [sourceName, targetName] of MODELS) {
    const source = join(repoRoot, "node_modules/@gutenye/ocr-models/assets", sourceName);
    const target = join(targetDir, targetName);
    const from = statSync(source);
    let upToDate = false;
    try {
      upToDate = statSync(target).size === from.size;
    } catch {
      // not copied yet
    }
    if (upToDate) continue;
    copyFileSync(source, target);
    console.log(`copied ${targetName} -> ${appDir}/public/ocr/ (${(from.size / 1048576).toFixed(1)} MB)`);
  }
} catch (err) {
  console.error(`Failed to copy the OCR models: ${err.message}`);
  console.error("Run `npm install` first — the models ship in @gutenye/ocr-models.");
  process.exit(1);
}
