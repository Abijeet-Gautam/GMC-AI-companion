export const themes = [
  {
    id: "nature",
    label: "Nature & sustainability",
    short: "Nature",
    color: "#83BD83",
    chamber: 2,
    message: "May nature and green spaces flourish in our city.",
    prompt: "I hope our city has green spaces where people and nature thrive.",
  },
  {
    id: "innovation",
    label: "Innovation & technology",
    short: "Innovation",
    color: "#85BCE2",
    chamber: 3,
    message: "May thoughtful innovation create a brighter future.",
    prompt: "I hope technology helps us build a thoughtful, connected city.",
  },
  {
    id: "education",
    label: "Education & opportunity",
    short: "Opportunity",
    color: "#EAC16C",
    chamber: 3,
    message: "May everyone have opportunities to learn and grow.",
    prompt:
      "I hope young people can learn new skills and find meaningful work.",
  },
  {
    id: "community",
    label: "Community & belonging",
    short: "Community",
    color: "#E8A38A",
    chamber: 4,
    message: "May everyone feel welcome and connected.",
    prompt: "I hope everyone feels welcome and connected to their community.",
  },
  {
    id: "wellbeing",
    label: "Wellbeing & mindfulness",
    short: "Wellbeing",
    color: "#BCA9DD",
    chamber: 4,
    message: "May our city nurture mindful and healthy lives.",
    prompt: "I hope our city makes space for peaceful, healthy, mindful lives.",
  },
  {
    id: "culture",
    label: "Culture & identity",
    short: "Culture",
    color: "#DDCF94",
    chamber: 1,
    message: "May our traditions enrich the future.",
    prompt:
      "I hope Bhutanese culture and traditions stay alive as our city grows.",
  },
] as const;
export type Theme = (typeof themes)[number]["id"];
// Chamber names and relative locations follow the visitor-supplied isometric
// experience-centre plan. Theme-to-chamber recommendations are our interpretation.
export const chambers = {
  1: "Immersive Experience Room",
  2: "3D Model Mapping",
  3: "8 Business Sectors",
  4: "Life in Gelephu Mindfulness City",
} as const;
export type ChamberId = keyof typeof chambers;
export const chamberDetails = {
  1: {
    eyebrow: "Begin the experience",
    short: "Immersive room",
    description:
      "An immersive introduction to the city. A place to begin exploring its wider story.",
    reason:
      "Your hope connects with the values and shared vision behind the city.",
    location: "Beside reception, at the front of the exhibition.",
    direction:
      "From reception, look for the entrance marked Chamber 1 beside the immersive room.",
  },
  2: {
    eyebrow: "See the city take shape",
    short: "Model mapping",
    description:
      "The city model and mapping area, where you can explore its spatial layout.",
    reason:
      "Your hope connects with how places, nature and everyday life fit together.",
    location: "The central model area, beyond the immersive room.",
    direction:
      "Continue into the exhibition beyond Chamber 1 and follow the signs for Chamber 2, the model mapping area.",
  },
  3: {
    eyebrow: "Explore opportunity",
    short: "Business sectors",
    description:
      "The eight business sectors exhibit. Explore the economic opportunities presented for the city.",
    reason:
      "Your hope connects with skills, innovation and opportunities for meaningful work.",
    location: "At the far end of the exhibition, past the central model area.",
    direction:
      "Continue past the model mapping area towards the far end and look for the Chamber 3 signs.",
  },
  4: {
    eyebrow: "Imagine everyday life",
    short: "Life in the city",
    description:
      "An exhibit about life in the city, shown along the landscaped rear side of the plan.",
    reason:
      "Your hope connects with the community and everyday life people imagine for the city.",
    location:
      "Along the rear exhibition area, near the assistant and postcard board.",
    direction:
      "Look for Chamber 4 along the rear exhibit area, near the assistant and postcard board shown in the plan.",
  },
} as const;
export type ContributionReceipt = {
  leaf: Leaf;
  reply: string;
  reply_mode: "openai" | "offline";
  mode: "openai" | "offline";
};
export type Leaf = {
  id: string;
  category: Theme;
  leaf_message: string;
  chamber_id: keyof typeof chambers;
  chamber_reason: string;
  created_at: string;
  mode: "openai" | "offline";
  is_demo: boolean;
};
export type TreeStats = {
  total: number;
  today: number;
  demo: number;
  categories: Record<Theme, number>;
};
export type Reflection = {
  body: string;
  mode: "openai" | "offline";
  created_at: string;
};
export type TreeSnapshot = {
  leaves: Leaf[];
  total: number;
  stats: TreeStats;
  reflection: Reflection | null;
  revision: number;
  serverTime: string;
  settings: import("./tree-settings").TreeSettings;
};
export const themeFor = (id: Theme) => themes.find((theme) => theme.id === id)!;
