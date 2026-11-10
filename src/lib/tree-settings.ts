import { z } from "zod";

export const treeSettingsSchema = z.object({
  species: z.enum(["oak", "pine", "willow", "cypress"]),
  palette: z.enum(["spring", "blossom", "autumn", "night"]),
  seed: z.number().int().min(1).max(999999),
  age: z.number().min(0.3).max(1),
  density: z.number().min(0.5).max(1.6),
  wind: z.number().min(0).max(1),
  rotation: z.number().min(0).max(360),
  quality: z.enum(["auto", "low", "high"]),
  renderer: z.enum(["auto", "illustration"]),
  acceptingContributions: z.boolean(),
  headline: z.string().trim().min(1).max(90),
});
export type TreeSettings = z.infer<typeof treeSettingsSchema>;
export const defaultTreeSettings: TreeSettings = {
  species: "oak",
  palette: "spring",
  seed: 8263,
  age: 0.72,
  density: 1,
  wind: 0.28,
  rotation: 20,
  quality: "auto",
  renderer: "auto",
  acceptingContributions: true,
  headline: "The future grows with every voice.",
};
export const treePalettes = {
  spring: {
    leaves: ["#64864e", "#95b85e", "#c5d78c"],
    wood: "#9c7953",
    grass: "#506e47",
  },
  blossom: {
    leaves: ["#af6e83", "#e4a2b5", "#f6d5db"],
    wood: "#927258",
    grass: "#668357",
  },
  autumn: {
    leaves: ["#a35732", "#d29642", "#edd084"],
    wood: "#9a7150",
    grass: "#807345",
  },
  night: {
    leaves: ["#3e6e68", "#73a393", "#bbd7b0"],
    wood: "#9d9275",
    grass: "#3e6251",
  },
} as const;
