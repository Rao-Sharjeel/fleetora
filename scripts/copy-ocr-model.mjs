/**
 * Copies the PP-OCR recognition model into a kiosk app's public/ directory.
 *
 * The model can't be imported: @gutenye/ocr-models' exports map doesn't expose
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

const source = join(
  repoRoot,
  "node_modules/@gutenye/ocr-models/assets/ch_PP-OCRv4_rec_infer.onnx",
);
const targetDir = join(repoRoot, appDir, "public/ocr");
const target = join(targetDir, "ppocr-rec.onnx");

try {
  const from = statSync(source);
  let upToDate = false;
  try {
    upToDate = statSync(target).size === from.size;
  } catch {
    // not copied yet
  }
  if (upToDate) {
    process.exit(0);
  }
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  console.log(`copied OCR model -> ${appDir}/public/ocr/ppocr-rec.onnx (${(from.size / 1048576).toFixed(1)} MB)`);
} catch (err) {
  console.error(`Failed to copy the OCR model: ${err.message}`);
  console.error("Run `npm install` first — the model ships in @gutenye/ocr-models.");
  process.exit(1);
}
