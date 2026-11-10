export const themes = [
  {
    id: "nature",
    label: "Nature & sustainability",
    short: "Nature",
    color: "#83BD83",
    chamber: 2,
    message: "May nature and green spaces flourish in our city.",
    prompt: "I hope GMC has green spaces where people and nature thrive.",
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
    chamber: 1,
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
export const chambers = {
  1: "The Vision",
  2: "Urban Blueprint",
  3: "Economy of Tomorrow",
  4: "My City, My Future",
} as const;
export const chamberDetails = {
  1: {
    eyebrow: "Begin with purpose",
    description:
      "Reflect on the vision behind Gelephu Mindfulness City and the values you would like its future to carry.",
    reason:
      "Your hope connects with the values and vision that shape the city's future.",
  },
  2: {
    eyebrow: "Imagine a place to thrive",
    description:
      "Explore the idea of a city that makes room for people and nature. Consider how the places around us can support a better everyday life.",
    reason:
      "Your hope connects with the way a city can make space for people and nature.",
  },
  3: {
    eyebrow: "Explore what comes next",
    description:
      "Think about learning, innovation and the possibilities of tomorrow. What opportunities would you like the next generation to have?",
    reason:
      "Your hope connects with learning, innovation and opportunities for tomorrow.",
  },
  4: {
    eyebrow: "Find your place in the story",
    description:
      "Bring your own perspective to the city's future. Reflect on the everyday choices and shared hopes that help a community grow.",
    reason:
      "Your hope connects with the part each of us can play in a shared future.",
  },
} as const;
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
};
export const themeFor = (id: Theme) => themes.find((theme) => theme.id === id)!;
