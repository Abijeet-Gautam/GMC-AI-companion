import { z } from "zod";

export const treeSettingsSchema = z.object({
  species: z.enum(["oak", "pine", "willow", "cypress", "bush", "spooky"]),
  palette: z.enum(["spring", "blossom", "autumn", "night", "frost"]),
  seed: z.number().int().min(1).max(999999),
  age: z.number().min(0.05).max(1),
  density: z.number().min(0.5).max(1.6),
  wind: z.number().min(0).max(1),
  rotation: z.number().min(0).max(360),
  quality: z.enum(["auto", "low", "high"]),
  renderer: z.enum(["auto", "illustration"]),
  acceptingContributions: z.boolean(),
  headline: z.string().trim().min(1).max(90),
  growthMode: z.enum(["contributions", "manual"]).default("contributions"),
  leavesForMaturity: z.number().int().min(8).max(500).default(48),
  size: z.number().min(2).max(8).default(4.87),
  mainLimbs: z.number().int().min(2).max(6).default(4),
  levels: z.number().int().min(1).max(3).default(2),
  branches: z.number().int().min(2).max(4).default(3),
  spread: z.number().min(0.25).max(1.5).default(0.89),
  crookedness: z.number().min(0).max(1).default(0.34),
  trunkThickness: z.number().min(0.08).max(0.6).default(0.21),
  baseFlare: z.number().min(0).max(3).default(1.69),
  trunkHeight: z.number().min(0).max(2).default(0),
  splitHeight: z.number().min(0.15).max(0.7).default(0.38),
  whorls: z.number().int().min(3).max(12).default(8),
  droop: z.number().min(-1).max(1).default(-0.6),
  hang: z.number().min(0.2).max(1.2).default(0.8),
  clumpSize: z.number().min(0.5).max(2).default(1.15),
  leafSize: z.number().min(0.4).max(2).default(1),
  leafShape: z.enum(["pointed", "round", "oak", "needle"]).default("pointed"),
  season: z.number().min(0).max(1).default(0.25),
  windSpeed: z.number().min(0.1).max(2).default(0.8),
  windDirection: z.number().min(-180).max(180).default(0),
  flutter: z.number().min(0).max(1).default(0.35),
  grass: z.boolean().default(true),
  autoRotate: z.boolean().default(false),
  sunAngle: z.number().min(-180).max(180).default(-35),
  sunHeight: z.number().min(0.15).max(1.4).default(0.8),
  sunIntensity: z.number().min(0.5).max(3).default(1.8),
  skyIntensity: z.number().min(0.3).max(2).default(1.25),
  customColors: z.boolean().default(false),
  leafShadow: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#64864e"),
  leafMid: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#95b85e"),
  leafLight: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#c5d78c"),
  woodColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#9c7953"),
});
export type TreeSettings = z.infer<typeof treeSettingsSchema>;
export const defaultTreeSettings: TreeSettings = treeSettingsSchema.parse({
  species: "oak",
  palette: "spring",
  seed: 8263,
  age: 0.72,
  density: 1,
  wind: 0.42,
  rotation: 20,
  quality: "auto",
  renderer: "auto",
  acceptingContributions: true,
  headline: "The future grows with every voice.",
});
// Scene colors from just-a-simple-tree/themes.js (MIT), kept together so
// leaves, grass, sky and shadows remain a coherent scene in every palette.
export const treePalettes = {
  blossom: {
    leaves: ["#d9789b", "#ff94b6", "#ffadce"],
    wood: "#bfb8d1",
    grass: "#1cab47",
    grassTip: "#a8e1c6",
    background: "#ffe5f4",
    shadow: "#2e3b5c",
  },
  spring: {
    leaves: ["#4ea276", "#a8ff75", "#d7f08c"],
    wood: "#8a796a",
    grass: "#11a63e",
    grassTip: "#77dfca",
    background: "#c4f3fd",
    shadow: "#2e3b5c",
  },
  autumn: {
    leaves: ["#ff7e38", "#ffae00", "#f5e26b"],
    wood: "#805f4d",
    grass: "#9c1c1c",
    grassTip: "#eb6847",
    background: "#fffae0",
    shadow: "#2e3b5c",
  },
  frost: {
    leaves: ["#7f9fb5", "#b9d3e2", "#f2f8fb"],
    wood: "#66686c",
    grass: "#407da5",
    grassTip: "#e3f0f7",
    background: "#4194c8",
    shadow: "#2e3b5c",
  },
  night: {
    leaves: ["#245370", "#2d707c", "#3b878c"],
    wood: "#3b414f",
    grass: "#092534",
    grassTip: "#0e575d",
    background: "#1f2947",
    shadow: "#000000",
  },
} as const;
