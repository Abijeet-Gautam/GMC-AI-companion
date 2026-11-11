import type { Theme } from "./catalog";

// Curated from official GMC information, rather than generated city claims.
// Checked 2026-11-11. Keep future proposals described as aims or plans.
export const gmcFacts: Record<Theme, { text: string; source: string }> = {
  nature: {
    text: "Gelephu's city-development plans include green corridors, parks and landscapes that bring mindfulness and environmental care into urban design.",
    source: "https://gmc.bt/city-development",
  },
  innovation: {
    text: "Green energy and technologies are among the city's focus areas, alongside education, wellness, tourism and other sectors.",
    source: "https://gmc.bt/about",
  },
  education: {
    text: "Education and knowledge is one of the city's core focus areas, recognising the role of learning in its future development.",
    source: "https://gmc.bt/about",
  },
  community: {
    text: "The city-development approach brings infrastructure, community wellbeing, cultural values and respect for nature into the same planning vision.",
    source: "https://gmc.bt/city-development",
  },
  wellbeing: {
    text: "Health and wellness is a core focus area. The city's broader vision connects development with balance, mindfulness and wellbeing.",
    source: "https://gmc.bt/about",
  },
  culture: {
    text: "Gelephu's development vision is rooted in Bhutanese values, with spiritual and cultural projects included in the city's planning work.",
    source: "https://gmc.bt/city-development",
  },
};
