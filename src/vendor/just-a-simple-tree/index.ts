import type { BufferGeometry, Vector3 } from "three";
import { oak } from "./oak.js";
import { pine } from "./pine.js";
import { willow } from "./willow.js";
import { cypress } from "./cypress.js";
import { bush } from "./bush.js";
import { spooky } from "./spooky.js";
import type { TreeSettings } from "@/lib/tree-settings";
export type Clump = {
  position: Vector3;
  radius: number;
  birth: number;
  grown?: number;
  flatten?: number;
  scale?: Vector3;
};
export type ProceduralTree = { geometry: BufferGeometry; clumps: Clump[] };
export function generateTree(settings: TreeSettings): ProceduralTree {
  const species = { oak, pine, willow, cypress, bush, spooky }[
    settings.species
  ];
  // Always retain the full upstream growth attributes. The renderer unfolds
  // these same branches continuously, so arrivals never rebuild the whole tree.
  return species.grow({
    ...species.settings,
    species: settings.species,
    seed: settings.seed,
    treeAge: 1,
    size: settings.size,
    trunkThickness: settings.trunkThickness,
    baseFlare: settings.baseFlare,
    trunkHeight: settings.trunkHeight,
    splitHeight: settings.splitHeight,
    splitScatter: 0.25,
    mainLimbs: settings.mainLimbs,
    levels: settings.levels,
    branches: settings.branches,
    whorls: settings.whorls,
    whorlBranches: 5,
    droop: settings.droop,
    slenderness: 1,
    cypressBranches: 22,
    willowStrands: 55,
    hang: settings.hang,
    spread: settings.spread,
    crookedness: settings.crookedness,
    sides: 7,
    smoothness: 1,
    twigs: 0,
    variety: 0.6,
    clumpSize: settings.clumpSize,
    bushClumps: 9,
    twist: 1,
    curls: 0.75,
    roots: 5,
    leavesLeft: 1,
  }) as ProceduralTree;
}
