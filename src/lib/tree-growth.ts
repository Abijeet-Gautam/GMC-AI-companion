import type { TreeSettings } from "./tree-settings";
export function treeGrowth(count: number, settings: TreeSettings) {
  const total = Math.max(0, Math.floor(count));
  if (settings.growthMode === "manual")
    return {
      count: total,
      progress: settings.age,
      scale: 1,
      phase: "preview",
      fullness: Math.max(0, 1 - settings.season) ** 0.7,
    };
  const fraction = 1 - Math.exp((-total / settings.leavesForMaturity) * 2.7);
  return {
    count: total,
    progress: 0.38 + 0.62 * fraction,
    scale:
      0.65 +
      0.35 * fraction +
      Math.min(0.25, Math.log1p(total / settings.leavesForMaturity) * 0.045),
    phase:
      total === 0
        ? "bare sapling"
        : total < 8
          ? "first leaves"
          : total < 24
            ? "young tree"
            : total < settings.leavesForMaturity
              ? "branching out"
              : "flourishing",
    fullness: total ? 1 : 0,
  };
}
export function smoothGrowth(birth: number, progress: number) {
  const k = Math.max(0, Math.min(1, (progress * 1.25 - birth) / 0.25));
  return k * k * (3 - 2 * k);
}
