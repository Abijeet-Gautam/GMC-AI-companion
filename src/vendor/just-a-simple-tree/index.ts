import type { BufferGeometry, Vector3 } from "three";
import { oak } from "./oak.js";
import { pine } from "./pine.js";
import { willow } from "./willow.js";
import { cypress } from "./cypress.js";
import { growAged } from "./tree-age.js";
import type { TreeSettings } from "@/lib/tree-settings";
export type Clump = { position: Vector3; radius: number; birth: number; grown?: number; flatten?: number; scale?: Vector3 };
export type ProceduralTree = { geometry: BufferGeometry; clumps: Clump[] };
export function generateTree(settings: TreeSettings): ProceduralTree {
  const species = { oak, pine, willow, cypress }[settings.species];
  const params = {
    species: settings.species, seed: settings.seed, treeAge: settings.age,
    size: 4.87, trunkThickness: 0.21, baseFlare: 1.69, trunkHeight: 0,
    splitHeight: 0.38, splitScatter: 0.25, mainLimbs: 4, levels: 2, branches: 3,
    whorls: 8, whorlBranches: 5, droop: -0.6, slenderness: 1,
    cypressBranches: 22, willowStrands: 55, hang: 0.8, spread: 0.89,
    crookedness: 0.34, sides: 7, smoothness: 1, twigs: 0, variety: 0.6,
    clumpSize: 1.15, ...species.settings,
  };
  return growAged(species, params) as ProceduralTree;
}
