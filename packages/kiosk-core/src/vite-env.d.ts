/// <reference types="vite/client" />

/** onnxruntime-web exports its wasm binaries as package subpaths; `?url` makes
 * Vite fingerprint and serve one locally instead of letting the runtime fetch
 * it from a CDN, which a gate kiosk can't rely on. */
declare module "onnxruntime-web/ort-wasm-simd-threaded.wasm?url" {
  const src: string;
  export default src;
}
