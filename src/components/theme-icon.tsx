import {
  Sprout,
  Lightbulb,
  GraduationCap,
  Users,
  Heart,
  Landmark,
} from "lucide-react";
import type { Theme } from "@/lib/catalog";
const icons = {
  nature: Sprout,
  innovation: Lightbulb,
  education: GraduationCap,
  community: Users,
  wellbeing: Heart,
  culture: Landmark,
};
export function ThemeIcon({
  theme,
  size = 20,
  className,
}: {
  theme: Theme;
  size?: number;
  className?: string;
}) {
  const Icon = icons[theme];
  return <Icon size={size} strokeWidth={1.5} className={className} />;
}
