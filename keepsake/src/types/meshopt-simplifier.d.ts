// three ships meshoptimizer's simplifier (MIT) without types; only the calls Keepsake uses are declared.
declare module 'three/addons/libs/meshopt_simplifier.module.js' {
  export const MeshoptSimplifier: {
    ready: Promise<void>;
    compactMesh(indices: Uint32Array): [Uint32Array, number];
    simplify(
      indices: Uint32Array,
      positions: Float32Array,
      stride: number,
      targetIndexCount: number,
      targetError: number,
      flags?: string[],
    ): [Uint32Array, number];
    simplifySloppy(
      indices: Uint32Array,
      positions: Float32Array,
      stride: number,
      lock: Uint8Array | null,
      targetIndexCount: number,
      targetError: number,
    ): [Uint32Array, number];
  };
}
