/**
 * `three` no longer ships its own TypeScript declarations, and the WebGPU/TSL
 * entry points are not covered by the community types either. The procedural
 * tree modules are plain JavaScript (see src/components/tree/three), so these
 * entry points are only ever touched through `await import(...)` inside a
 * client effect, where `any` is the honest type: the surface is a build-time
 * ESM graph, not something this app statically reasons about.
 */
declare module 'three/webgpu';
declare module 'three/tsl';
